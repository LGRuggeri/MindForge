"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useAvaliacao,
  useResultadoAvaliacao,
  useSubmeterAvaliacao,
} from "@/lib/hooks/useAvaliacoes";
import { useSubmeterTentativa } from "@/lib/hooks/useExercicios";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { ResultadoSimulado } from "@/components/resultado-simulado";
import { ExecutorCodigo } from "@/components/executor-codigo";

export default function SimuladoPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : null;
  const { perfilSelecionado } = useAppStore();

  if (!perfilSelecionado) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Selecione um perfil</h1>
        <p className="text-muted-foreground mb-6">
          Você precisa selecionar ou criar um perfil antes de responder o
          simulado.
        </p>
        <Button asChild>
          <Link href="/perfis">Ir para perfis</Link>
        </Button>
      </div>
    );
  }
  if (!id) return <p>Simulado não encontrado</p>;
  return (
    <SessaoSimulado
      key={`${id}:${perfilSelecionado.id}`}
      id={id}
      perfilId={perfilSelecionado.id}
    />
  );
}

function SessaoSimulado({ id, perfilId }: { id: string; perfilId: string }) {
  const consultaAvaliacao = useAvaliacao(id);
  const { data: avaliacao, isLoading } = consultaAvaliacao;
  const consultaResultado = useResultadoAvaliacao(id, perfilId);
  const submeterTentativa = useSubmeterTentativa();
  const submeterAvaliacao = useSubmeterAvaliacao();

  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [tentativas, setTentativas] = useState<Record<string, string>>({});
  const [submetendo, setSubmetendo] = useState(false);

  if (
    isLoading ||
    consultaResultado.isPending ||
    (consultaResultado.isFetching && !consultaResultado.data?.resultado)
  ) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const resultado = consultaResultado.data?.resultado;
  const erro =
    consultaAvaliacao.error ?? (!resultado ? consultaResultado.error : null);
  if (erro) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-10">
        <p role="alert">
          {erro.message || "Não foi possível consultar o simulado."}
        </p>
        <Button
          onClick={() => {
            void consultaAvaliacao.refetch();
            void consultaResultado.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!avaliacao) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Simulado não encontrado</h1>
        <Button asChild variant="outline">
          <Link href="/objetivos">Voltar</Link>
        </Button>
      </div>
    );
  }

  const itens = [...(avaliacao.exercicios ?? [])].sort(
    (a, b) => a.ordem - b.ordem,
  );
  const todosRespondidos =
    itens.length > 0 && itens.every((item) => tentativas[item.exercicio.id]);

  const handleResponder = async (exercicioId: string) => {
    if (resultado || submetendo || submeterTentativa.isPending) return;
    const resposta = respostas[exercicioId]?.trim();
    if (!resposta) {
      toast.error("Digite uma resposta antes de submeter.");
      return;
    }

    try {
      const tentativa = await submeterTentativa.mutateAsync({
        exercicioId,
        respostaUsuario: resposta,
        perfilId,
        avaliacaoId: id,
      });
      setTentativas((prev) => ({ ...prev, [exercicioId]: tentativa.id }));
      toast.success("Resposta registrada!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao submeter resposta",
      );
    }
  };

  const handleFinalizar = async () => {
    if (resultado || submetendo) return;
    if (!todosRespondidos) {
      toast.error("Responda todos os exercícios antes de finalizar.");
      return;
    }

    setSubmetendo(true);
    try {
      await submeterAvaliacao.mutateAsync({
        avaliacaoId: id,
        perfilId,
        respostas: itens.map((item) => ({
          exercicioId: item.exercicio.id,
          tentativaId: tentativas[item.exercicio.id],
        })),
      });
      toast.success("Simulado finalizado!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao finalizar simulado",
      );
    } finally {
      setSubmetendo(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/objetivos">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {avaliacao.titulo}
          </h1>
          <p className="text-muted-foreground text-sm">
            {itens.length} questões ·{" "}
            {resultado
              ? "Simulado finalizado"
              : "Responda todas antes de finalizar"}
          </p>
        </div>
      </div>

      {resultado ? (
        <ResultadoSimulado resultado={resultado} />
      ) : (
        <>
          {itens.length === 0 && (
            <p role="alert" className="text-muted-foreground">
              Este simulado não possui questões. Crie outro após adicionar
              exercícios ao módulo ou trilha.
            </p>
          )}
          {itens.map((item, index) => {
            const exercicioId = item.exercicio.id;
            const respondido = Boolean(tentativas[exercicioId]);

            return (
              <Card key={exercicioId}>
                <CardHeader>
                  <CardTitle className="text-base font-medium flex items-start gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">
                      {item.exercicio.enunciado}
                    </span>
                    {respondido && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{item.exercicio.tipo}</Badge>
                    <Badge variant="secondary">
                      {item.exercicio.dificuldade}
                    </Badge>
                  </div>
                  <Textarea
                    aria-label={`Resposta da questão ${index + 1}`}
                    placeholder="Digite sua resposta..."
                    value={respostas[exercicioId] ?? ""}
                    onChange={(e) =>
                      setRespostas((prev) => ({
                        ...prev,
                        [exercicioId]: e.target.value,
                      }))
                    }
                    disabled={respondido || submetendo}
                    className={`min-h-[120px] ${item.exercicio.tipo === "codigo" ? "font-mono" : ""}`}
                  />
                  {item.exercicio.tipo === "codigo" && (
                    <ExecutorCodigo
                      exercicioId={exercicioId}
                      perfilId={perfilId}
                      codigo={respostas[exercicioId] ?? ""}
                      disabled={
                        respondido || submetendo || submeterTentativa.isPending
                      }
                    />
                  )}
                  <Button
                    onClick={() => handleResponder(exercicioId)}
                    disabled={
                      respondido || submetendo || submeterTentativa.isPending
                    }
                    size="sm"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {respondido ? "Respondido" : "Submeter resposta"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {itens.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                Nenhum exercício neste simulado.
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleFinalizar}
              disabled={!todosRespondidos || submetendo}
              size="lg"
            >
              {submetendo ? "Finalizando..." : "Finalizar simulado"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
