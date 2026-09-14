/* global process, console, Buffer */
// Integração Docker explícita, separada da suíte unitária e da cobertura SQL.
require('reflect-metadata');
require('ts-node/register');
const assert = require('node:assert/strict');
const { ConfigService } = require('@nestjs/config');
const { DockerExecutor } = require('../src/modules/sandbox/docker-executor');
const { DockerProcesso } = require('../src/modules/sandbox/docker-processo');

async function main() {
  const processo = new DockerProcesso();
  const executor = new DockerExecutor(new ConfigService({ SANDBOX_TEMPO_MS: 2000 }), processo);
  let aprovados = 0;
  async function testar(nome, linguagem, codigo, validar, entrada = '', alvo = executor) {
    const res = await alvo.executar({ linguagem, codigo, entrada });
    validar(res);
    aprovados++;
    console.log(`Aprovado: ${nome} (${res.status})`);
  }
  await testar(
    'Python e entrada Unicode',
    'python',
    'print(input().upper())',
    (r) => {
      assert.equal(r.status, 'concluido');
      assert.equal(r.stdout.trim(), 'OLÁ');
    },
    'Olá',
  );
  await testar(
    'JavaScript e entrada Unicode',
    'javascript',
    'console.log(require("node:fs").readFileSync(0,"utf8").toUpperCase())',
    (r) => {
      assert.equal(r.status, 'concluido');
      assert.equal(r.stdout.trim(), 'AÇÃO');
    },
    'ação',
  );
  await testar('Erro de sintaxe', 'python', 'isto não compila :', (r) => {
    assert.equal(r.status, 'erro');
    assert.match(r.stderr, /SyntaxError/);
  });
  await testar('Loop infinito', 'javascript', 'while(true){}', (r) =>
    assert.equal(r.status, 'limite_tempo'),
  );
  await testar(
    'Watchdog protegido contra sinais do programa',
    'python',
    `import os,signal
try:
 os.kill(os.getppid(),signal.SIGSTOP)
except PermissionError:
 print('supervisor protegido',flush=True)
while True: pass`,
    (r) => {
      assert.equal(r.status, 'limite_tempo');
      assert.match(r.stdout, /supervisor protegido/);
    },
  );
  await testar(
    'Programa não recupera root ou capacidades',
    'python',
    `import os
try:
 os.setuid(0)
except PermissionError:
 print('sem root')
print(next(l.strip() for l in open('/proc/self/status') if l.startswith('CapEff:')))`,
    (r) => {
      assert.equal(r.status, 'concluido');
      assert.match(r.stdout, /sem root/);
      assert.match(r.stdout, /CapEff:\s+0000000000000000/);
    },
  );
  await testar('Saída excessiva', 'python', 'print("a"*100000)', (r) => {
    assert.equal(r.status, 'limite_saida');
    assert.ok(Buffer.byteLength(r.stdout + r.stderr) <= 32768);
  });
  await testar(
    'Memória limitada',
    'python',
    'a=[bytearray(16*1024*1024) for _ in range(64)]',
    (r) => assert.equal(r.status, 'limite_memoria'),
  );
  // Reproduz a perda do evento OOM do runtime, mantendo a execução Docker real.
  const processoSemEvento = new DockerProcesso();
  const consultar = processoSemEvento.executar.bind(processoSemEvento);
  processoSemEvento.executar = async (...args) => {
    const res = await consultar(...args);
    if (args[0][0] === 'inspect' && res.codigo === 0) {
      res.stdout = JSON.stringify({ ...JSON.parse(res.stdout), OOMKilled: false });
    }
    return res;
  };
  const semEvento = new DockerExecutor(new ConfigService({ SANDBOX_TEMPO_MS: 2000 }), processoSemEvento);
  for (const [linguagem, codigo, saidaReservada] of [
    ['python', 'a=[bytearray(16*1024*1024) for _ in range(64)]', 'import sys;sys.exit(200)'],
    ['javascript', 'const a=[];for(let i=0;i<64;i++)a.push(Buffer.alloc(16*1024*1024,1));', 'process.exit(200)'],
  ]) {
    await testar(
      `Memória sem evento OOM do Docker (${linguagem})`,
      linguagem,
      codigo,
      (r) => assert.equal(r.status, 'limite_memoria', JSON.stringify(r)),
      '',
      semEvento,
    );
    await testar(
      `Programa não forja o diagnóstico de memória (${linguagem})`,
      linguagem,
      saidaReservada,
      (r) => assert.equal(r.status, 'erro'),
    );
  }
  await testar(
    'Rede, identidade, arquivos, segredos e recursos',
    'python',
    `import os,socket,json
s=socket.socket(); s.settimeout(0.2)
try:
 s.connect(('1.1.1.1',80)); rede=True
except OSError:
 rede=False
print(json.dumps({'uid':os.getuid(),'rede':rede,'somenteLeitura':bool(os.statvfs('/').f_flag & os.ST_RDONLY),'socket':os.path.exists('/var/run/docker.sock'),'segredo':os.getenv('LLM_API_KEY'),'memoria':open('/sys/fs/cgroup/memory.max').read().strip(),'processos':open('/sys/fs/cgroup/pids.max').read().strip(),'cpu':open('/sys/fs/cgroup/cpu.max').read().strip()}))`,
    (r) => {
      assert.equal(r.status, 'concluido');
      assert.deepEqual(JSON.parse(r.stdout), {
        uid: 65534,
        rede: false,
        somenteLeitura: true,
        socket: false,
        segredo: null,
        memoria: '134217728',
        processos: '32',
        cpu: '50000 100000',
      });
    },
  );
  await testar(
    'Arquivo temporário',
    'python',
    'open("/tmp/marca","w").write("teste");print("gravado")',
    (r) => assert.equal(r.status, 'concluido'),
  );
  await testar(
    'Isolamento entre execuções',
    'python',
    'import os;print(os.path.exists("/tmp/marca"))',
    (r) => assert.equal(r.stdout.trim(), 'False'),
  );
  const restantes = await processo.executar(['ps', '-aq', '--filter=label=mindforge.sandbox=true']);
  assert.equal(restantes.codigo, 0);
  assert.equal(
    restantes.stdout.trim(),
    '',
    'Há containers de sandbox remanescentes; verifique se outra execução está em andamento.',
  );
  console.log(`${aprovados} cenários Docker aprovados; nenhum container remanescente.`);
}
main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
