/* global URL */
const { resolve } = require('node:path');

function validarBancoCi(url) {
  if (!url) throw new Error('TEST_DATABASE_URL é obrigatória para o CI.');
  const destino = new URL(url);
  if (
    !['postgres:', 'postgresql:'].includes(destino.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(destino.hostname) ||
    // O driver permite sobrescrever host/porta pela query string.
    destino.search !== '' ||
    destino.hash !== '' ||
    !/^\/mindforge_ci(?:_[a-f0-9]+)?$/.test(destino.pathname)
  ) {
    throw new Error('O CI exige um banco local exclusivo com nome mindforge_ci.');
  }
  return url;
}

function validarRelatorios(resultado, cobertura, arquivos) {
  if (
    !resultado?.success ||
    resultado.numTotalTests < 1 ||
    resultado.numPassedTests !== resultado.numTotalTests ||
    ['numFailedTests', 'numPendingTests', 'numTodoTests', 'numPendingTestSuites'].some(
      (campo) => resultado[campo] !== 0,
    )
  ) {
    throw new Error('CI exige todos os testes aprovados, sem skips ou TODOs.');
  }
  const esperados = new Set(arquivos.map((arquivo) => resolve(arquivo)));
  if (
    !arquivos.some((arquivo) => arquivo.endsWith('-postgres.spec.ts')) ||
    esperados.size !== arquivos.length
  ) {
    throw new Error('Manifesto de suítes SQL ausente ou inválido.');
  }
  if (!Array.isArray(resultado.testResults) || resultado.testResults.length !== esperados.size) {
    throw new Error('Uma ou mais suítes não foram executadas.');
  }
  let casos = 0;
  for (const suite of resultado.testResults) {
    if (
      typeof suite.name !== 'string' ||
      !esperados.delete(resolve(suite.name)) ||
      suite.status !== 'passed' ||
      !Array.isArray(suite.assertionResults) ||
      suite.assertionResults.length === 0 ||
      suite.assertionResults.some((teste) => teste.status !== 'passed')
    ) {
      throw new Error('Suíte incompleta ou teste não executado no CI.');
    }
    casos += suite.assertionResults.length;
  }
  if (casos !== resultado.numTotalTests) throw new Error('Contagem de testes inconsistente.');
  for (const metrica of ['lines', 'statements', 'functions', 'branches']) {
    const valor = cobertura?.total?.[metrica];
    if (
      !valor ||
      !Number.isInteger(valor.total) ||
      !Number.isInteger(valor.covered) ||
      valor.total <= 0 ||
      valor.covered > valor.total ||
      valor.covered * 100 < valor.total * 80
    ) {
      throw new Error(`Cobertura global de ${metrica} abaixo de 80% ou relatório inválido.`);
    }
  }
}

module.exports = { validarBancoCi, validarRelatorios };
