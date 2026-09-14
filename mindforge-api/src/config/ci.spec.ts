import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const { validarRelatorios, validarBancoCi } = jest.requireActual<{
  validarRelatorios: (resultado: unknown, cobertura: unknown, arquivos: string[]) => void;
  validarBancoCi: (url: string | undefined) => string;
}>('../../scripts/validar-ci.cjs');

describe('CI — execução completa e cobertura obrigatórias', () => {
  const arquivos = [resolve('src/exemplo.spec.ts'), resolve('src/exemplo-postgres.spec.ts')];
  const relatorio = () => ({
    success: true,
    numTotalTests: 2,
    numPassedTests: 2,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    numPendingTestSuites: 0,
    testResults: arquivos.map((name) => ({
      name,
      status: 'passed',
      assertionResults: [{ status: 'passed' }],
    })),
  });
  const cobertura = () => ({
    total: Object.fromEntries(
      ['lines', 'statements', 'functions', 'branches'].map((metrica) => [
        metrica,
        { total: 100, covered: 80 },
      ]),
    ),
  });

  it('aceita todas as suítes executadas e quatro métricas em 80%', () => {
    expect(() => validarRelatorios(relatorio(), cobertura(), arquivos)).not.toThrow();
  });
  it.each(['numPendingTests', 'numTodoTests', 'numPendingTestSuites', 'numFailedTests'])(
    'rejeita resultado com %s',
    (campo) => {
      expect(() =>
        validarRelatorios({ ...relatorio(), [campo]: 1 }, cobertura(), arquivos),
      ).toThrow();
    },
  );
  it('recusa suíte ausente mesmo que a cobertura seja suficiente', () => {
    const resultado = relatorio();
    resultado.testResults.pop();
    expect(() => validarRelatorios(resultado, cobertura(), arquivos)).toThrow();
  });
  it('recusa sucesso sem testes SQL descobertos', () => {
    expect(() => validarRelatorios(relatorio(), cobertura(), [arquivos[0]])).toThrow();
  });
  it('recusa skip no detalhe e suíte sem casos executados', () => {
    const resultado = relatorio();
    resultado.testResults[1].assertionResults[0].status = 'pending';
    expect(() => validarRelatorios(resultado, cobertura(), arquivos)).toThrow();
    resultado.testResults[1].assertionResults = [];
    expect(() => validarRelatorios(resultado, cobertura(), arquivos)).toThrow();
  });
  it.each(['lines', 'statements', 'functions', 'branches'])(
    'falha por cobertura de %s abaixo do limite',
    (metrica) => {
      const dados = cobertura();
      dados.total[metrica] = { total: 100, covered: 79 };
      expect(() => validarRelatorios(relatorio(), dados, arquivos)).toThrow();
    },
  );
  it('não arredonda 79,999% para aprovar e recusa dados ausentes', () => {
    const dados = cobertura();
    dados.total.lines = { total: 100000, covered: 79999 };
    expect(() => validarRelatorios(relatorio(), dados, arquivos)).toThrow();
    expect(() => validarRelatorios(null, {}, arquivos)).toThrow();
    expect(() => validarRelatorios(relatorio(), { total: {} }, arquivos)).toThrow();
  });
  it.each([
    undefined,
    'postgres://teste:teste@localhost:5433/mindforge',
    'postgres://teste:teste@externo.invalid/mindforge_ci',
    'postgres://teste:teste@127.0.0.1:5544/mindforge_ci?host=externo.invalid&port=5432',
    'postgres://teste:teste@127.0.0.1:5544/mindforge_ci?dbname=mindforge',
  ])('recusa banco fora do escopo de CI', (url) => {
    expect(() => validarBancoCi(url)).toThrow();
  });
  it('aceita apenas banco local identificado para CI', () => {
    const url = 'postgres://teste:teste@127.0.0.1:5544/mindforge_ci';
    expect(validarBancoCi(url)).toBe(url);
  });

  it.each([
    { motivo: 'URL ausente', url: undefined, args: [] },
    {
      motivo: 'banco indisponível',
      url: 'postgres://teste:teste@127.0.0.1:1/mindforge_ci',
      args: [],
    },
    { motivo: 'filtro de execução', url: undefined, args: ['--testNamePattern=parcial'] },
  ])('o comando termina com falha por $motivo', ({ url, args }) => {
    const resultado = spawnSync(
      process.execPath,
      [resolve(__dirname, '../../scripts/testar-ci.cjs'), ...args],
      {
        env: { NODE_ENV: 'test', ...(url ? { TEST_DATABASE_URL: url } : {}) },
        encoding: 'utf8',
        timeout: 10000,
        windowsHide: true,
      },
    );
    expect(resultado.error).toBeUndefined();
    expect(resultado.status).toBe(1);
    expect(resultado.stdout).not.toContain('CI aprovado');
    expect(resultado.stderr).toContain('Validação de CI reprovada');
    expect(resultado.stderr).not.toContain('postgres://');
  });
});
