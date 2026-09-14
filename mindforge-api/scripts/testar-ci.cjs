/* global process, __dirname */
const { spawnSync } = require('node:child_process');
const { readFileSync, mkdirSync, rmSync } = require('node:fs');
const { resolve } = require('node:path');
const { validarBancoCi, validarRelatorios } = require('./validar-ci.cjs');
const { prepararBancoCi } = require('./preparar-banco-ci.cjs');

async function executarCi() {
  if (process.argv.length > 2) throw new Error('A execução oficial não aceita filtros de testes.');
  const banco = validarBancoCi(process.env.TEST_DATABASE_URL);
  await prepararBancoCi(banco);
  const cwd = resolve(__dirname, '..');
  const env = {
    ...process.env,
    DATABASE_URL: banco,
    TEST_DATABASE_URL: banco,
    MINDFORGE_SQL_TESTS: '1',
    NODE_ENV: 'test',
  };
  const jest = resolve(cwd, 'node_modules/jest/bin/jest.js');
  const descoberta = spawnSync(process.execPath, [jest, '--listTests', '--json', '--runInBand'], {
    cwd,
    env,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (descoberta.error || descoberta.status !== 0) throw new Error('Falha ao descobrir as suítes.');
  const arquivos = JSON.parse(descoberta.stdout);
  const diretorio = resolve(cwd, 'coverage');
  mkdirSync(diretorio, { recursive: true });
  const relatorio = resolve(diretorio, 'resultado-ci.json');
  const cobertura = resolve(diretorio, 'coverage-summary.json');
  // Apenas os dois relatórios conhecidos; nunca reutilizar aprovação antiga.
  rmSync(relatorio, { force: true });
  rmSync(cobertura, { force: true });
  const testes = spawnSync(
    process.execPath,
    [
      jest,
      '--ci',
      '--runInBand',
      '--coverage',
      '--coverageReporters=text-summary',
      '--coverageReporters=json-summary',
      '--coverageReporters=lcov',
      '--json',
      `--outputFile=${relatorio}`,
    ],
    { cwd, env, stdio: 'inherit', windowsHide: true },
  );
  if (testes.error || testes.status !== 0) throw new Error('Testes ou cobertura reprovados.');
  validarRelatorios(
    JSON.parse(readFileSync(relatorio, 'utf8')),
    JSON.parse(readFileSync(cobertura, 'utf8')),
    arquivos,
  );
  process.stdout.write(
    'CI aprovado: todas as suítes executadas, sem skips e com cobertura global >= 80%.\n',
  );
}

if (require.main === module) {
  executarCi().catch(() => {
    process.stderr.write(
      'Validação de CI reprovada. Verifique banco, execução completa e relatórios de cobertura.\n',
    );
    process.exitCode = 1;
  });
}
module.exports = { executarCi };
