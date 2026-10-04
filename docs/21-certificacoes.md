# 21 — Trilhas guiadas por assunto, concurso e certificação

O usuário continua podendo escrever qualquer objetivo e pedir uma trilha livre ao Planner. Também pode iniciar diretamente por **Programas prontos** em **Objetivos**, escolhendo a grade e os módulos antes de criar seu estudo. A sequência e as referências ficam registradas na trilha do perfil; conteúdo e exercícios continuam sendo gerados pelos módulos existentes do MindForge. O fluxo completo e a separação por perfil estão em [Programas por perfil](24-programas-por-perfil.md).

## Catálogo inicial

| Código | Tipo | Referência principal | Módulos |
|---|---|---|---:|
| `CIBERSEGURANCA` | Assunto | [NIST CSF 2.0](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1299.pdf), usado como estrutura para governar, identificar, proteger, detectar, responder e recuperar | 7 |
| `KALI-LINUX` | Assunto | [Documentação oficial do Kali Linux](https://www.kali.org/docs/); estudo em máquina virtual e laboratório próprio ou autorizado | 7 |
| `AZ-900` | Certificação | [Guia Microsoft Azure Fundamentals](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900), habilidades desde 20/07/2026 | 8 |
| `AWS-CLF-C02` | Certificação | [Guia AWS Cloud Practitioner](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html) | 8 |
| `ISC2-CC` | Certificação | [Programa ISC2 Certified in Cybersecurity](https://www.isc2.org/certifications/cc/cc-certification-exam-outline), vigente desde 01/09/2026 | 7 |
| `CONCURSO-LIBRAS-IBAM-2026` | Concurso, conhecimentos específicos | [Anexo III do IBAM](https://www.ibam-concursos.org.br/documento/an3.psedu26.pdf), grade revisada em 03/10/2026 | 11 |

Os pesos publicados nos programas de certificação aparecem na interface. Trilhas por assunto não recebem pesos de prova. Os resumos dos cinco programas originais são autorais, em português, e foram conferidos em **23/09/2026**; a grade de Libras usa a revisão de **03/10/2026**. A [orientação do Kali](https://www.kali.org/docs/introduction/should-i-use-kali-linux/) recomenda familiaridade com Linux e começar por uma máquina virtual.

A Microsoft já anuncia uma alteração da SC-900 para **21/10/2026** em seu [guia de estudo](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/sc-900). Ela não entrou neste lote para evitar misturar as versões atual e futura da prova.

## API e histórico

O catálogo está em `mindforge-api/src/modules/planner/trilhas-guiadas/`. As rotas são:

```http
GET /planner/programas
GET /planner/certificacoes
POST /planner/trilhas
Content-Type: application/json

{"objetivoId":"uuid","programaCodigo":"ISC2-CC"}
```

`GET /planner/programas` retorna assuntos, concursos e certificações; `GET /planner/certificacoes` permanece disponível para clientes do piloto AZ-900. O campo anterior `certificacaoCodigo` também continua aceito para certificações. Os dois códigos não podem ser enviados juntos. A criação direta usa `POST /planner/objetivos` com `perfilId`, título preenchido pelo programa, `programaCodigo` e `modulosIndices` (posições originais, começando em 1); os módulos selecionados são criados junto ao objetivo na mesma transação.

O Planner salva o programa utilizado em `trilhas_estudo.metadata.programa`. Para certificações, também mantém `metadata.certificacao`, preservando o formato do piloto anterior. Trilhas AZ-900 já criadas com apenas `metadata.certificacao` continuam reconhecidas pela interface. A nova trilha substitui a ativa do mesmo objetivo e preserva seu registro anterior.

## Limites atuais

- O catálogo é revisado manualmente; mudanças nas fontes exigem conferir assuntos, pesos e data de revisão. Não há atualização automática.
- As trilhas por assunto são roteiros de estudo, não certificações oficiais. NIST CSF 2.0 e a documentação do Kali servem de referências para essa organização.
- As questões do MindForge são geradas para estudo; não são questões reais de certificação. O simulado usa exercícios já cadastrados e ainda não reproduz o formato ou os pesos das provas.
- Os módulos escolhidos mantêm a ordem da grade. Seleções parciais cobrem apenas esse recorte; personalização automática por lacunas do aluno é um passo futuro.

## Verificação

Os testes do catálogo exigem códigos únicos, cobertura de todas as seções e até oito módulos nos programas originais ou onze na grade específica de Libras. A criação guiada aceita um ou mais módulos selecionados. Testes do Planner cobrem seleção, separação por perfil, atomicidade, geração livre e compatibilidade da entrada AZ-900; testes da página cobrem escolha, troca de perfil e regeneração.
