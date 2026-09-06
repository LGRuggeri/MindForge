'use client';

import { isValidElement, useState, type ReactNode } from 'react';
import ReactMarkdown, { type Components, type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

// O conteúdo é gerado pelo pipeline local de LLM, mas ainda assim sanitiza:
// só permite as tags do schema padrão + details/summary.
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'details', 'summary'],
};

function textoDe(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textoDe).join('');
  if (isValidElement(node)) {
    return textoDe((node.props as { children?: ReactNode }).children);
  }
  return '';
}

function linguagemDe(className?: string): string | undefined {
  return /language-([\w+-]+)/.exec(className ?? '')?.[1];
}

function BlocoCodigo({ className, children }: { className?: string; children?: ReactNode }) {
  const [copiado, setCopiado] = useState(false);
  const linguagem = linguagemDe(className);
  const texto = textoDe(children).replace(/\n$/, '');

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard indisponível (ex.: ambiente de teste) — nada a fazer.
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-lg border bg-muted/40">
      <div className="flex items-center justify-between border-b bg-muted px-3 py-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {linguagem ?? 'código'}
        </span>
        <button
          type="button"
          onClick={copiar}
          aria-label="Copiar código"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copiado ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

interface PropsElemento {
  node?: unknown;
  children?: ReactNode;
  [chave: string]: unknown;
}

function semNode<T extends PropsElemento>(props: T) {
  // `node` é injetado pelo react-markdown e não pode ir para o DOM.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { node: _node, ...resto } = props;
  return resto;
}

const componentesPadrao: Components = {
  // O fence (```) gera pre > code; o `pre` vira wrapper e o `code` bloco
  // renderiza o cartão com header — assim não aninha <pre> em <pre>.
  pre({ children }) {
    return <div className="not-prose">{children}</div>;
  },
  code({ className, children }) {
    const ehBloco = !!linguagemDe(className) || textoDe(children).includes('\n');
    if (!ehBloco) {
      return (
        <code
          className={cn(
            'rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-mono',
            className,
          )}
        >
          {children}
        </code>
      );
    }
    return (
      <BlocoCodigo className={className}>{children}</BlocoCodigo>
    );
  },
  table({ children }) {
    return (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border-b bg-muted px-3 py-2 text-left font-semibold">{children}</th>
    );
  },
  td({ children }) {
    return <td className="border-b px-3 py-2 align-top last:border-b-0">{children}</td>;
  },
  a({ href, children }) {
    const externo = typeof href === 'string' && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        target={externo ? '_blank' : undefined}
        rel={externo ? 'noreferrer noopener' : undefined}
        className="font-medium text-primary underline underline-offset-4"
      >
        {children}
      </a>
    );
  },
  details({ children, ...props }) {
    return (
      <details
        {...semNode(props)}
        className="my-4 rounded-lg border bg-muted/30 px-4 py-2 open:pb-3"
      >
        {children}
      </details>
    );
  },
  summary({ children, ...props }) {
    return (
      <summary
        {...semNode(props)}
        className="cursor-pointer select-none py-1 text-sm font-medium"
      >
        {children}
      </summary>
    );
  },
  img({ src, alt, ...props }) {
    return (
      <span className="not-prose my-4 block overflow-hidden rounded-lg border">
        {/* Conteúdo é gerado localmente pelo LLM; eslint de img desativado de propósito. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          {...semNode({ src, alt, ...props })}
          src={typeof src === 'string' ? src : undefined}
          alt={alt ?? ''}
          className="max-w-full"
        />
      </span>
    );
  },
};

interface MarkdownViewerProps extends Omit<Options, 'components'> {
  components?: Components;
}

export function MarkdownViewer({ components, ...props }: MarkdownViewerProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, schema], rehypeHighlight]}
      components={{ ...componentesPadrao, ...components }}
      {...props}
    />
  );
}
