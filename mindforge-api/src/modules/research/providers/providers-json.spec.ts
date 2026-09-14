import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ApiSearchProvider } from './api-search.provider';
import { SerperSearchProvider } from './serper-search.provider';

describe.each([
  ['API', ApiSearchProvider, 'Authorization'],
  ['Serper', SerperSearchProvider, 'X-API-KEY'],
] as const)('%s — contrato HTTP/JSON', (_nome, Provider, header) => {
  let fetchSpy: jest.SpyInstance;
  let warn: jest.SpyInstance;
  const registro = { title: ' Guia ', link: 'https://www.example.org/guia', snippet: ' Resumo ' };
  const config = (extra: Record<string, unknown> = {}) =>
    new ConfigService({
      SEARCH_API_URL: 'https://busca.local/search',
      SEARCH_API_KEY: 'chave-teste',
      SEARCH_TIMEOUT_MS: 2500,
      ...extra,
    });
  const responder = (dados: unknown) =>
    fetchSpy.mockResolvedValue({ ok: true, json: async () => dados });
  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());
  it.each([{ organic: [registro] }, { results: [registro] }, { web: { results: [registro] } }])(
    'extrai formato suportado %j',
    async (dados) => {
      responder(dados);
      const resultado = await new Provider(config()).buscar('consulta privada', 2);
      expect(resultado).toEqual([
        { titulo: 'Guia', url: registro.link, resumo: 'Resumo', fonte: 'example.org' },
      ]);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://busca.local/search',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ q: 'consulta privada', num: 2 }),
          signal: expect.any(AbortSignal),
          headers: expect.objectContaining({
            [header]: header === 'Authorization' ? 'Bearer chave-teste' : 'chave-teste',
          }),
        }),
      );
    },
  );
  it.each([null, [], 3, {}, { organic: {} }, { web: [] }, { web: { results: 'invalido' } }])(
    'trata estrutura sem resultados %j',
    async (dados) => {
      responder(dados);
      expect(await new Provider(config()).buscar('teste')).toEqual([]);
    },
  );
  it('filtra campos inválidos, URLs inseguras e duplicatas antes do limite', async () => {
    responder({
      organic: [
        null,
        [],
        { title: {}, link: 'https://bad.local' },
        { ...registro, link: 'javascript:alert(1)' },
        registro,
        registro,
        { ...registro, title: 'Outra', link: 'https://example.org/outra' },
      ],
    });
    expect(await new Provider(config()).buscar('teste', 2)).toEqual([
      expect.objectContaining({ titulo: 'Guia' }),
      expect.objectContaining({ titulo: 'Outra' }),
    ]);
  });
  it('suporta aliases e campos opcionais ausentes sem coerção de objetos', async () => {
    responder({
      results: [
        { titulo: 'Português', url: 'https://example.org/a', resumo: 'Resumo', fonte: 'Portal' },
        { title: 'Conteúdo', href: 'https://example.org/b', content: 'Texto' },
        { title: 'Descrição', url: 'https://example.org/c', description: 'Descrição' },
        { title: 'Descrição local', url: 'https://example.org/d', descricao: 'Descrição local' },
        { title: 'Sem resumo', url: 'https://example.org/e', snippet: {}, fonte: {} },
      ],
    });
    const resultado = await new Provider(config({ SEARCH_API_KEY: undefined })).buscar('teste');
    expect(resultado.map((r) => r.resumo)).toEqual([
      'Resumo',
      'Texto',
      'Descrição',
      'Descrição local',
      '',
    ]);
    expect(resultado[0].fonte).toBe('Portal');
    expect(resultado[4].fonte).toBe('example.org');
    expect(fetchSpy.mock.calls[0][1].headers[header]).toBeUndefined();
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).num).toBe(8);
  });
  it('recusa configuração ausente sem request', async () => {
    await expect(
      new Provider(config({ SEARCH_API_URL: undefined })).buscar('teste'),
    ).rejects.toThrow('SEARCH_API_URL');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it.each([401, 429, 500])('propaga HTTP %s sem logar consulta', async (status) => {
    fetchSpy.mockResolvedValue({ ok: false, status });
    await expect(new Provider(config()).buscar('consulta privada')).rejects.toThrow();
    expect(JSON.stringify(warn.mock.calls)).not.toContain('consulta privada');
  });
  it.each(['rede', 'json'])('não expõe payload do erro de %s', async (tipo) => {
    const erro = new Error('SEGREDO');
    if (tipo === 'rede') fetchSpy.mockRejectedValue(erro);
    else
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => {
          throw erro;
        },
      });
    await expect(new Provider(config()).buscar('consulta privada')).rejects.not.toThrow('SEGREDO');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('SEGREDO');
  });
});
