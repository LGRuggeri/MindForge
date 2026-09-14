import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import WebSocket from 'ws';
import type { AudioProvider, GerarAudioParams } from '../audio.service';

/**
 * Provedor de TTS baseado nas vozes neurais do serviço Read Aloud do
 * Microsoft Edge (mesmo protocolo WebSocket usado pelo navegador).
 * Gratuito, sem chave de API, ~322 vozes em 45+ idiomas.
 *
 * Não oficial: depende de um endpoint de consumo da Microsoft e pode parar
 * de funcionar sem aviso. O AudioService isola esse risco — trocar de
 * provedor não afeta os consumidores.
 *
 * O serviço exige o token Sec-MS-GEC (hash SHA-256 do Windows file time
 * arredondado em 5 min + token do cliente, mesma geração do edge-tts
 * Python — ver rany2/edge-tts drm.py). Sem ele o handshake é rejeitado 403.
 */

// Token público extraído do próprio Edge; usado por todas as implementações
// conhecidas (edge-tts Python, etc.).
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const BASE_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;
const WIN_EPOCH_SEGUNDOS = 11644473600;
const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';
const ORIGIN = 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold';

// Vozes padrão por idioma (BCP-47), quando o chamador não escolhe uma voz.
const VOZES_PADRAO: Record<string, string> = {
  'pt-br': 'pt-BR-FranciscaNeural',
  pt: 'pt-BR-FranciscaNeural',
  en: 'en-US-AriaNeural',
  'en-us': 'en-US-AriaNeural',
  'en-gb': 'en-GB-LibbyNeural',
  es: 'es-ES-ElviraNeural',
  'es-es': 'es-ES-ElviraNeural',
  'es-mx': 'es-MX-DaliaNeural',
  fr: 'fr-FR-DeniseNeural',
  de: 'de-DE-KatjaNeural',
  it: 'it-IT-ElsaNeural',
  ja: 'ja-JP-NanamiNeural',
  ko: 'ko-KR-SunHiNeural',
  zh: 'zh-CN-XiaoxiaoNeural',
  hi: 'hi-IN-SwaraNeural',
};

@Injectable()
export class EdgeTtsProvider implements AudioProvider {
  readonly nome = 'edge-tts';

  async sintetizar(params: GerarAudioParams): Promise<{ buffer: Buffer; mime: string }> {
    const voz = this.resolverVoz(params);
    const idioma = this.resolverIdioma(voz);

    const audio = await this.sintetizarViaWebSocket(params.texto, voz, idioma);
    if (audio.length === 0) {
      throw new Error('O provedor Edge-TTS retornou áudio vazio');
    }

    return { buffer: audio, mime: 'audio/mpeg' };
  }

  private resolverVoz(params: GerarAudioParams): string {
    if (params.voz) {
      return params.voz;
    }
    const idioma = (params.idioma ?? 'en').toLowerCase();
    return VOZES_PADRAO[idioma] ?? VOZES_PADRAO['en'];
  }

  private resolverIdioma(voz: string): string {
    // A voz já carrega o idioma no prefixo (ex.: 'pt-BR-FranciscaNeural').
    const prefixo = voz.split('-').slice(0, 2).join('-');
    return prefixo || 'en-US';
  }

  private sintetizarViaWebSocket(texto: string, voz: string, idioma: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const pedacos: Buffer[] = [];
      let finalizado = false;
      const connectionId = this.gerarHex(16);
      const url =
        BASE_URL +
        '?TrustedClientToken=' +
        TRUSTED_CLIENT_TOKEN +
        '&ConnectionId=' +
        connectionId +
        '&Sec-MS-GEC=' +
        this.gerarSecMsGec() +
        '&Sec-MS-GEC-Version=' +
        SEC_MS_GEC_VERSION;
      const ws = new WebSocket(url, {
        headers: {
          Origin: ORIGIN,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
          Pragma: 'no-cache',
          'Cache-Control': 'no-cache',
        },
      });

      const encerrar = (erro?: Error) => {
        if (finalizado) return;
        finalizado = true;
        clearTimeout(timeout);
        ws.off('open', abrir);
        ws.off('message', receber);
        ws.off('error', falhar);
        ws.off('close', fechar);
        if (ws.readyState !== WebSocket.CLOSED) {
          // terminate durante o handshake pode emitir error antes de close.
          const ignorarErroTardio = () => undefined;
          const limparFechamento = () => ws.off('error', ignorarErroTardio);
          ws.on('error', ignorarErroTardio);
          ws.once('close', limparFechamento);
          try {
            if (erro) ws.terminate();
            else ws.close();
          } catch {
            ws.off('error', ignorarErroTardio);
            ws.off('close', limparFechamento);
          }
        }
        if (erro) reject(erro);
        else resolve(Buffer.concat(pedacos));
      };
      const abrir = () => {
        if (finalizado) return;
        try {
          ws.send(this.mensagemConfig());
          ws.send(this.mensagemSsml(texto, voz, idioma));
        } catch {
          encerrar(new Error('Falha ao enviar solicitação ao Edge-TTS'));
        }
      };
      const receber = (dados: WebSocket.RawData, isBinary: boolean) => {
        if (finalizado) return;
        const buffer = Buffer.isBuffer(dados)
          ? dados
          : Array.isArray(dados)
            ? Buffer.concat(dados)
            : Buffer.from(dados);
        if (!isBinary) {
          const path = this.pathMensagem(buffer.toString('utf-8').split('\r\n\r\n')[0]);
          if (path === 'turn.end') encerrar();
          else if (path === 'turn.error') encerrar(new Error('Edge-TTS rejeitou a síntese'));
          return;
        }
        try {
          const payload = this.extrairPayloadAudio(buffer);
          if (payload && payload.length > 0) pedacos.push(payload);
        } catch {
          encerrar(new Error('Frame de áudio inválido recebido do Edge-TTS'));
        }
      };
      const falhar = () => encerrar(new Error('Erro no WebSocket do Edge-TTS'));
      const fechar = () =>
        encerrar(new Error('Conexão com Edge-TTS fechada antes do fim da síntese'));
      // Piso de 30s; textos longos recebem 10 ms por caractere.
      const timeout = setTimeout(
        () => encerrar(new Error('Timeout ao sintetizar áudio com Edge-TTS')),
        Math.max(30_000, texto.length * 10),
      );
      ws.on('open', abrir);
      ws.on('message', receber);
      ws.on('error', falhar);
      ws.on('close', fechar);
    });
  }

  private pathMensagem(cabecalho: string): string | undefined {
    return /(?:^|\r\n)Path:([^\r\n]+)(?:\r\n|$)/.exec(cabecalho)?.[1];
  }

  /** Dois bytes big-endian de tamanho, cabeçalho ASCII e payload de áudio. */
  private extrairPayloadAudio(buffer: Buffer): Buffer | null {
    if (buffer.length < 2) throw new Error('Frame incompleto');
    const inicioPayload = 2 + buffer.readUInt16BE(0);
    if (buffer.length < inicioPayload) throw new Error('Cabeçalho incompleto');
    const cabecalho = buffer.subarray(2, inicioPayload).toString('ascii');
    if (this.pathMensagem(cabecalho) !== 'audio') return null;
    return buffer.subarray(inicioPayload);
  }

  private mensagemConfig(): string {
    const config = {
      context: {
        synthesis: {
          audio: {
            metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
            outputFormat: OUTPUT_FORMAT,
          },
        },
      },
    };
    return `X-Timestamp:${this.timestampZulu()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${JSON.stringify(config)}`;
  }

  private mensagemSsml(texto: string, voz: string, idioma: string): string {
    const requestId = this.gerarHex(16);
    const ssml =
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${idioma}'>` +
      `<voice name='${voz}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${this.escaparXml(texto)}` +
      `</prosody></voice></speak>`;
    return (
      `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\n` +
      `X-Timestamp:${this.timestampZulu()}\r\nPath:ssml\r\n\r\n${ssml}`
    );
  }

  private timestampZulu(): string {
    return new Date().toISOString().replace(/\.[0-9]+Z$/, 'Z');
  }

  /**
   * Gera o token Sec-MS-GEC exigido pelo serviço: SHA-256 do Windows file
   * time (epoch 1601, intervalos de 100ns) arredondado para baixo em 5
   * minutos, concatenado com o trusted client token. A aritmética em ponto
   * flutuante é proposital — replica a geração do edge-tts Python (drm.py)
   * para que o hash bata com o calculado no servidor.
   */
  private gerarSecMsGec(): string {
    let ticks = Math.floor(Date.now() / 1000) + WIN_EPOCH_SEGUNDOS;
    ticks -= ticks % 300;
    ticks *= 1e7;
    const entrada = `${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`;
    return createHash('sha256').update(entrada, 'ascii').digest('hex').toUpperCase();
  }

  private gerarHex(bytes: number): string {
    return Array.from({ length: bytes }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, '0'),
    ).join('');
  }

  private escaparXml(texto: string): string {
    return texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
