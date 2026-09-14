import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { EdgeTtsProvider } from './edge-tts.provider';

jest.mock('ws', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { CLOSED: 3, OPEN: 1 }),
}));

class SocketTeste extends EventEmitter {
  readyState = 1;
  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = 3;
    this.emit('close');
  });
  terminate = jest.fn(() => {
    this.readyState = 3;
    this.emit('close');
  });
}
function frame(path: string, audio: Buffer) {
  const header = Buffer.from('Content-Type:audio/mpeg\r\nPath:' + path + '\r\n');
  const tamanho = Buffer.alloc(2);
  tamanho.writeUInt16BE(header.length);
  return Buffer.concat([tamanho, header, audio]);
}
describe('Edge-TTS — protocolo e encerramento', () => {
  let ws: SocketTeste;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-14T12:00:00Z'));
    ws = new SocketTeste();
    (WebSocket as unknown as jest.Mock).mockImplementation(() => ws);
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  const mensagem = (texto: string) => ws.emit('message', Buffer.from(texto), false);
  const finalizar = () => mensagem('Path:turn.end\r\n\r\n');
  function limpo() {
    expect(jest.getTimerCount()).toBe(0);
    expect(ws.eventNames()).toEqual([]);
  }
  it.each([
    ['pt-BR', 'pt-BR-FranciscaNeural'],
    ['en-gb', 'en-GB-LibbyNeural'],
    [undefined, 'en-US-AriaNeural'],
    ['xx', 'en-US-AriaNeural'],
  ])('sintetiza idioma %s, escapando XML e concatenando áudio', async (idioma, voz) => {
    const resultado = new EdgeTtsProvider().sintetizar({
      texto: '<Olá & "você"> \'teste\'',
      idioma,
    });
    ws.emit('open');
    const ssml = ws.send.mock.calls[1][0];
    expect(ssml).toContain(voz);
    expect(ssml).toContain('&lt;Olá &amp; &quot;você&quot;&gt; &apos;teste&apos;');
    expect(ws.send.mock.calls[0][0]).toContain('audio-24khz-48kbitrate-mono-mp3');
    const url = new URL((WebSocket as unknown as jest.Mock).mock.calls.at(-1)[0]);
    expect(url.searchParams.get('ConnectionId')).toMatch(/^[a-f0-9]{32}$/);
    expect(url.searchParams.get('Sec-MS-GEC')).toMatch(/^[A-F0-9]{64}$/);
    ws.emit('message', frame('audio', Buffer.from('um')), true);
    ws.emit('message', frame('audio.metadata', Buffer.from('ignorado')), true);
    mensagem('Path:response\r\n\r\n{"texto":"Path:turn.end"}');
    expect(ws.close).not.toHaveBeenCalled();
    ws.emit('message', frame('audio', Buffer.from('dois')), true);
    finalizar();
    expect(await resultado).toEqual({ mime: 'audio/mpeg', buffer: Buffer.from('umdois') });
    limpo();
  });
  it.each(['array', 'arraybuffer'])('aceita payload em %s', async (tipo) => {
    const resultado = new EdgeTtsProvider().sintetizar({ texto: 'Olá', voz: 'es-MX-DaliaNeural' });
    ws.emit('open');
    expect(ws.send.mock.calls[1][0]).toContain("xml:lang='es-MX'");
    const dados = frame('audio', Buffer.from('som'));
    ws.emit(
      'message',
      tipo === 'array' ? [dados.subarray(0, 4), dados.subarray(4)] : Uint8Array.from(dados).buffer,
      true,
    );
    finalizar();
    expect((await resultado).buffer.toString()).toBe('som');
    limpo();
  });
  it.each([Buffer.from([0]), Buffer.from([0, 40, 1])])(
    'recusa frame truncado depois de áudio parcial %j',
    async (invalido) => {
      const resultado = new EdgeTtsProvider().sintetizar({ texto: 'Olá' });
      const verificacao = expect(resultado).rejects.toThrow('Frame');
      ws.emit('message', frame('audio', Buffer.from('parcial')), true);
      ws.emit('message', invalido, true);
      finalizar();
      await verificacao;
      limpo();
    },
  );
  it('recusa áudio vazio', async () => {
    const resultado = new EdgeTtsProvider().sintetizar({ texto: 'Olá' });
    const verificacao = expect(resultado).rejects.toThrow('áudio vazio');
    ws.emit('message', frame('audio', Buffer.alloc(0)), true);
    finalizar();
    await verificacao;
    limpo();
  });
  it.each(['turn.error', 'error', 'close', 'timeout', 'send'])(
    'encerra recursos após %s e oculta dados privados',
    async (falha) => {
      const resultado = new EdgeTtsProvider().sintetizar({ texto: 'SEGREDO' });
      const verificacao = expect(resultado).rejects.not.toThrow('SEGREDO');
      if (falha === 'turn.error') mensagem('Path:turn.error\r\n\r\nSEGREDO');
      if (falha === 'error') ws.emit('error', new Error('SEGREDO'));
      if (falha === 'close') {
        ws.readyState = 3;
        ws.emit('close');
      }
      if (falha === 'timeout') jest.advanceTimersByTime(30000);
      if (falha === 'send') {
        ws.send.mockImplementation(() => {
          throw new Error('SEGREDO');
        });
        ws.emit('open');
      }
      await verificacao;
      limpo();
    },
  );
  it('tolera erro tardio durante fechamento e ignora mensagens após timeout', async () => {
    ws.terminate.mockImplementation(() => {
      ws.emit('error', new Error('SEGREDO tardio'));
      ws.readyState = 3;
      ws.emit('close');
    });
    const resultado = new EdgeTtsProvider().sintetizar({ texto: 'Olá' });
    const verificacao = expect(resultado).rejects.toThrow('Timeout');
    const receber = ws.listeners('message')[0];
    jest.advanceTimersByTime(30000);
    receber(Buffer.from('Path:turn.end\r\n\r\n'), false);
    await verificacao;
    expect(ws.terminate).toHaveBeenCalledTimes(1);
    limpo();
  });
});
