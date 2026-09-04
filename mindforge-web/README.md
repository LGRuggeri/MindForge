# MindForge Web

Frontend do MindForge em Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui.

## Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS v4
- **HTTP**: Axios com interceptação de erros RFC 7807
- **Cache/estado servidor**: TanStack Query (React Query)
- **Estado cliente**: Zustand (perfil selecionado)
- **Markdown**: react-markdown

## Estrutura

```text
mindforge-web/
├── app/              # Rotas (App Router)
│   ├── page.tsx      # Dashboard
│   ├── perfis/
│   ├── objetivos/
│   ├── modulos/[id]/
│   ├── tutor/
│   ├── revisao/
│   └── knowledge-graph/
├── components/       # Componentes reutilizáveis + UI do shadcn
├── lib/
│   ├── api.ts        # Instância Axios
│   ├── query-client.ts
│   ├── store.ts      # Zustand
│   └── hooks/        # Hooks TanStack Query por domínio
├── types/api.ts      # Tipagens do contrato com o backend
└── .env.example      # Variáveis de ambiente
```

## Configuração

```bash
cd mindforge-web
cp env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3000
```

> O backend (`mindforge-api`) deve estar rodando em `http://localhost:3000`.
> O frontend sobe por padrão na porta **3001**.

## Execução local

```bash
npm install
npm run dev
```

Abra `http://localhost:3001`.

## Build

```bash
npm run build
npm run lint
```

## Convenções

- Client components usam `'use client'`;
- Chamadas à API ficam em `lib/hooks/` via TanStack Query;
- Erros do backend no formato RFC 7807 são convertidos em mensagens amigáveis pelo interceptor do Axios;
- O perfil selecionado persiste no `localStorage` via Zustand.
