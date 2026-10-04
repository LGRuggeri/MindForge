"use client";
import { createContext, useContext, useState } from "react";
import type { Components } from "react-markdown";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAtividadesConteudo,
  useSalvarRespostaAtividade,
} from "@/lib/hooks/useAtividadesConteudo";
import type { AtividadeConteudo, Conteudo } from "@/types/api";

const ContextoAtividades = createContext<{
  porLinha: Map<number, AtividadeConteudo>;
  conteudoId: string;
  perfilId: string | null;
} | null>(null);

// O tipo do componente permanece estável quando a consulta atualiza outras respostas.
const componentesAtividades: Components = {
  li: function ItemAtividade({ node, children, ...props }) {
    const contexto = useContext(ContextoAtividades);
    const atividade = contexto?.porLinha.get(node?.position?.start.line ?? -1);
    return (
      <li {...props}>
        {children}
        {atividade && contexto?.perfilId && (
          <ResponderAtividade
            key={`${contexto.conteudoId}:${contexto.perfilId}:${atividade.chave}`}
            atividade={atividade}
            conteudoId={contexto.conteudoId}
            perfilId={contexto.perfilId}
          />
        )}
      </li>
    );
  },
};

function ResponderAtividade({
  atividade,
  conteudoId,
  perfilId,
}: {
  atividade: AtividadeConteudo;
  conteudoId: string;
  perfilId: string;
}) {
  const salvar = useSalvarRespostaAtividade();
  const [texto, setTexto] = useState(atividade.resposta?.texto ?? "");
  const [ultimaSalva, setUltimaSalva] = useState(
    atividade.resposta?.texto ?? "",
  );
  const [erro, setErro] = useState<string>();
  const id = `resposta-${conteudoId}-${atividade.chave}`;
  const alterada = texto.trim() !== ultimaSalva;
  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!texto.trim() || !alterada || salvar.isPending) return;
    setErro(undefined);
    try {
      const resposta = await salvar.mutateAsync({
        conteudoId,
        perfilId,
        chave: atividade.chave,
        resposta: texto.trim(),
      });
      setTexto(resposta.texto);
      setUltimaSalva(resposta.texto);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível salvar. Sua resposta foi mantida para tentar novamente.",
      );
    }
  };
  return (
    <form
      className="not-prose my-3 space-y-2 rounded-lg border bg-muted/20 p-3"
      onSubmit={enviar}
    >
      <Label htmlFor={id}>Sua resposta à atividade {atividade.numero}</Label>
      <Textarea
        id={id}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setErro(undefined);
        }}
        disabled={salvar.isPending}
        maxLength={10000}
        className="min-h-28"
        placeholder="Escreva sua resposta e salve para retomá-la depois."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          size="sm"
          disabled={salvar.isPending || !texto.trim() || !alterada}
          aria-label={`Salvar resposta da atividade ${atividade.numero}`}
        >
          {salvar.isPending ? "Salvando..." : "Salvar resposta"}
        </Button>
        {ultimaSalva && !alterada && !erro ? (
          <span role="status" className="text-sm text-muted-foreground">
            Resposta salva
          </span>
        ) : null}
        {alterada && (
          <span className="text-xs text-muted-foreground">
            Alterações ainda não salvas
          </span>
        )}
      </div>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </form>
  );
}

export function ConteudoComAtividades({
  conteudo,
  perfilId,
}: {
  conteudo: Pick<Conteudo, "id" | "corpoMarkdown">;
  perfilId: string | null;
}) {
  const {
    data: atividades,
    isError,
    refetch,
  } = useAtividadesConteudo(conteudo.id, perfilId);
  const porLinha = new Map(atividades?.map((a) => [a.linhaInicial, a]));
  return (
    <>
      {isError && (
        <div
          className="not-prose mb-4 rounded-lg border p-3 text-sm"
          role="alert"
        >
          Não foi possível carregar as respostas das atividades.
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}
      <ContextoAtividades.Provider
        value={{ porLinha, conteudoId: conteudo.id, perfilId }}
      >
        <MarkdownViewer components={componentesAtividades}>
          {conteudo.corpoMarkdown}
        </MarkdownViewer>
      </ContextoAtividades.Provider>
    </>
  );
}
