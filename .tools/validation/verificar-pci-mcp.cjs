const { mkdirSync, writeFileSync, readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
// Teste de leitura: usa o endpoint configurado para o projeto, sem chamar LLM.
const raiz = resolve(__dirname, '../..');
const config = readFileSync(join(raiz, '.codex/config.toml'), 'utf8');
const bloco = config.match(/\[mcp_servers\.pci-concursos\]([\s\S]*?)(?=\n\[mcp_servers\.|$)/)?.[1];
const endpoint = bloco?.match(/^\s*url\s*=\s*"([^"]+)"/m)?.[1];
if (endpoint !== 'https://mcp.pciconcursos.com.br/mcp') throw new Error('Endpoint PCI inesperado');
if (!bloco.includes('"buscar_por_cargo"')) throw new Error('Consulta de teste não habilitada');
const pastaSaida = join(raiz, '.cache/pci-mcp');
let sessao;
let protocolo;
let id = 0;

async function mensagem(method, params, notificacao = false) {
  const pedidoId = notificacao ? undefined : ++id;
  const resposta = await fetch(endpoint, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
    headers: {
      'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
      ...(sessao ? { 'Mcp-Session-Id': sessao } : {}),
      ...(protocolo ? { 'MCP-Protocol-Version': protocolo } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', ...(notificacao ? {} : { id: pedidoId }), method, params }),
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${method}`);
  if (method === 'initialize') sessao = resposta.headers.get('mcp-session-id') ?? undefined;
  if (notificacao) { await resposta.body?.cancel(); return; }
  const tipo = resposta.headers.get('content-type') ?? '';
  let mensagem;
  if (tipo.includes('application/json')) mensagem = await resposta.json();
  else if (tipo.includes('text/event-stream')) {
    const leitor = resposta.body.getReader();
    const decodificador = new TextDecoder();
    let texto = '';
    let tamanho = 0;
    try {
      while (!mensagem) {
        const parte = await leitor.read();
        if (parte.done) break;
        tamanho += parte.value.length;
        if (tamanho > 2 * 1024 * 1024) throw new Error('Resposta SSE excessiva');
        texto += decodificador.decode(parte.value, { stream: true }).replace(/\r\n/g, '\n');
        let fim;
        while ((fim = texto.indexOf('\n\n')) !== -1) {
          const bloco = texto.slice(0, fim);
          texto = texto.slice(fim + 2);
          const dados = bloco.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
          if (!dados) continue;
          const candidata = JSON.parse(dados);
          if (candidata.id === pedidoId) { mensagem = candidata; break; }
        }
      }
    } finally { await leitor.cancel(); }
  } else throw new Error('Tipo de resposta inesperado');
  if (!mensagem || mensagem.id !== pedidoId || mensagem.error) throw new Error(`Resposta JSON-RPC inválida em ${method}`);
  return mensagem.result;
}

(async () => {
  mkdirSync(pastaSaida, { recursive: true });
  try {
    const inicio = await mensagem('initialize', {
      protocolVersion: '2025-11-25', capabilities: {},
      clientInfo: { name: 'mindforge-verificacao-leitura', version: '0.1.0' },
    });
    protocolo = inicio.protocolVersion;
    if (!['2025-11-25', '2025-06-18', '2025-03-26'].includes(protocolo)) throw new Error('Versão MCP inesperada');
    await mensagem('notifications/initialized', {}, true);
    let cursor;
    const ferramentas = [];
    do {
      const pagina = await mensagem('tools/list', cursor ? { cursor } : {});
      if (!Array.isArray(pagina.tools)) throw new Error('Lista de ferramentas inválida');
      ferramentas.push(...pagina.tools);
      cursor = pagina.nextCursor;
      if (ferramentas.length > 100) throw new Error('Paginação excessiva');
    } while (cursor);
    const evidencia = { endpoint, consultadoEm: new Date().toISOString(), protocolo,
      servidor: inicio.serverInfo, capabilities: inicio.capabilities, ferramentas };
    writeFileSync(join(pastaSaida, 'ferramentas.json'), JSON.stringify(evidencia, null, 2) + '\n');
    process.stdout.write(JSON.stringify(evidencia, null, 2) + '\n');
    if (process.argv.includes('--amostra')) {
      const parametros = { name: 'buscar_por_cargo', arguments: { cargo: 'intérprete de libras', uf: 'sc' } };
      const resultado = await mensagem('tools/call', parametros);
      if (resultado.isError) throw new Error('A consulta retornou erro de ferramenta');
      const amostra = { endpoint, consultadoEm: new Date().toISOString(), ferramenta: parametros.name,
        argumentos: parametros.arguments, resultado };
      writeFileSync(join(pastaSaida, 'amostra.json'), JSON.stringify(amostra, null, 2) + '\n');
      process.stdout.write(JSON.stringify({ ferramenta: parametros.name, isError: resultado.isError ?? false,
        blocos: resultado.content?.length, amostra: JSON.stringify(resultado).slice(0, 2500) }, null, 2) + '\n');
    }
  } finally {
    if (sessao) await fetch(endpoint, { method: 'DELETE', redirect: 'error',
      headers: { 'Mcp-Session-Id': sessao, 'MCP-Protocol-Version': protocolo },
      signal: AbortSignal.timeout(5000) }).catch(() => {});
  }
})().catch(e => { process.stderr.write(`Verificação MCP: ${e.message}\n`); process.exitCode = 1; });
