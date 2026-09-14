import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EmbeddingService } from './embedding.service';

jest.mock('openai', () => ({ __esModule: true, default: jest.fn() }));
describe('Contrato do provedor de embeddings', () => {
  const vetor = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0));
  const criar = jest.fn();
  function servico(valores: Record<string, string> = {}) {
    return new EmbeddingService(new ConfigService({ LLM_API_KEY: 'chave-teste', ...valores }));
  }
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(OpenAI).mockImplementation(() => ({ embeddings: { create: criar } }) as never);
    criar.mockResolvedValue({ data: [{ index: 0, embedding: vetor }] });
  });
  it('usa provedor/modelo de embeddings separados do chat', async () => {
    const service = servico({
      EMBEDDING_API_KEY: 'embed-teste',
      EMBEDDING_BASE_URL: 'http://localhost:11434/v1',
      OPENAI_BASE_URL: 'http://chat.local/v1',
      EMBEDDING_MODEL: 'nomic-embed-text',
    });
    expect(await service.gerar('Texto')).toEqual(vetor);
    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: 'embed-teste',
      baseURL: 'http://localhost:11434/v1',
    });
    expect(criar).toHaveBeenCalledWith({ input: 'Texto', model: 'nomic-embed-text' });
  });
  it('mantém fallback da configuração de chat quando não há provedor separado', async () => {
    await servico({ OPENAI_BASE_URL: 'http://chat.local/v1' }).gerar('Texto');
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'chave-teste', baseURL: 'http://chat.local/v1' });
    expect(criar).toHaveBeenCalledWith({ input: 'Texto', model: 'text-embedding-3-small' });
  });
  it('usa URL padrão do SDK quando nenhuma foi configurada', async () => {
    await servico().gerar('Texto');
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'chave-teste' });
  });
  it.each([
    null,
    {},
    { data: [] },
    { data: [{ index: 0 }] },
    { data: [{ index: 0, embedding: [] }] },
    { data: [{ index: 0, embedding: Array(1536).fill(1) }] },
    { data: [{ index: 0, embedding: Array(768).fill(0) }] },
    { data: [{ index: 0, embedding: [NaN, ...vetor.slice(1)] }] },
    { data: [{ index: 0, embedding: [Infinity, ...vetor.slice(1)] }] },
    { data: [{ index: 0, embedding: ['1', ...vetor.slice(1)] }] },
    { data: [{ index: 1, embedding: vetor }] },
    {
      data: [
        { index: 0, embedding: vetor },
        { index: 1, embedding: vetor },
      ],
    },
  ])('rejeita resposta inválida antes de entregar o vetor (%#)', async (resposta) => {
    criar.mockResolvedValue(resposta);
    await expect(servico().gerar('Texto privado')).rejects.toThrow(BadGatewayException);
  });
  it('não expõe payload privado quando o provider falha', async () => {
    criar.mockRejectedValue(new Error('SEGREDO do provedor'));
    await expect(servico().gerar('Texto privado')).rejects.toThrow(
      'Não foi possível gerar o embedding',
    );
  });
});
