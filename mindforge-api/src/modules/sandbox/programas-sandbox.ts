// Launchers fixos. Apenas estes textos são argumentos do Docker; código do aluno
// chega em JSON pelo stdin e é escrito exclusivamente no tmpfs do container.
export const LAUNCHER_PYTHON = `import json,sys,os
d=json.load(sys.stdin)
open('/tmp/programa.py','w',encoding='utf-8').write(d['codigo'])
open('/tmp/entrada','w',encoding='utf-8').write(d.get('entrada') or '')
f=os.open('/tmp/entrada',os.O_RDONLY)
os.dup2(f,0)
os.close(f)
os.setgroups([])
os.setgid(65534)
os.setuid(65534)
os.execv('/usr/local/bin/python3',['python3','-I','-u','/tmp/programa.py'])`;

export const LAUNCHER_JAVASCRIPT = `const fs=require('node:fs');
const d=JSON.parse(fs.readFileSync(0,'utf8'));
fs.writeFileSync('/tmp/programa.js',d.codigo);
fs.writeFileSync('/tmp/entrada',d.entrada||'');
process.setgroups([]);
process.setgid(65534);
process.setuid(65534);
const p=require('node:child_process').spawn('/usr/local/bin/node',['/tmp/programa.js'],{stdio:[fs.openSync('/tmp/entrada','r'),1,2]});
p.on('error',()=>process.exit(1));
p.on('exit',(code)=>process.exit(code===null?1:code));`;
