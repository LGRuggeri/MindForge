"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useConcluirRevisao, useRevisaoDetalhe } from "@/lib/hooks/useRevisao";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

const niveis = [
  { qualidade: 0, texto: "Não lembrei" },
  { qualidade: 2, texto: "Lembrei só com ajuda" },
  { qualidade: 3, texto: "Lembrei com dificuldade" },
  { qualidade: 4, texto: "Lembrei com facilidade" },
  { qualidade: 5, texto: "Lembrei perfeitamente" },
];

export function SessaoRevisao({
  id,
  perfilId,
  aoFechar,
  aoConcluir,
}: {
  id: string;
  perfilId: string;
  aoFechar: () => void;
  aoConcluir: (proximaData: string) => void;
}) {
  const { data, error, isLoading, refetch } = useRevisaoDetalhe(id, perfilId);
  const concluir = useConcluirRevisao();
  const [revelado, setRevelado] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const enviando = useRef(false);
  const exercicio = data?.itemTipo === "exercicio";

  async function registrar(qualidade: number) {
    if (!data || enviando.current) return;
    enviando.current = true;
    try {
      const resultado = await concluir.mutateAsync({
        id,
        perfilId,
        qualidade,
        proximaRevisaoEsperada: data.proximaRevisao,
      });
      aoConcluir(resultado.proximaRevisao);
    } catch {
      // O erro fica visível na sessão; o rascunho é preservado para nova tentativa.
    } finally {
      enviando.current = false;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data?.item.titulo ?? "Revisar item"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-20 w-full" />}
        {error && (
          <div role="alert">
            <p>{error.message || "Item indisponível."}</p>
            <Button variant="outline" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        )}
        {data && (
          <>
            <p className="text-sm text-muted-foreground">
              Tente lembrar antes de consultar o material. Sua autoavaliação
              ajusta a agenda; ela não altera a nota de exercícios ou simulados.
            </p>
            {exercicio && (
              <div className="prose dark:prose-invert max-w-none">
                <MarkdownViewer>{data.item.texto}</MarkdownViewer>
              </div>
            )}
            <label className="block space-y-2">
              <span>
                O que você lembra? (rascunho opcional, não será salvo)
              </span>
              <Textarea
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                disabled={concluir.isPending}
              />
            </label>
            {!revelado ? (
              <Button onClick={() => setRevelado(true)}>
                {exercicio ? "Mostrar resposta" : "Consultar material"}
              </Button>
            ) : (
              <>
                <div className="prose dark:prose-invert max-w-none">
                  <MarkdownViewer>
                    {exercicio
                      ? data.item.resposta ||
                        "Este exercício não possui gabarito. Consulte o módulo e avalie sua lembrança."
                      : data.item.texto}
                  </MarkdownViewer>
                </div>
                {data.item.moduloId && (
                  <Link
                    href={`/modulos/${data.item.moduloId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Consultar módulo em outra aba
                  </Link>
                )}
                <fieldset disabled={concluir.isPending} className="space-y-3">
                  <legend className="font-medium">Como foi lembrar?</legend>
                  <div className="flex flex-wrap gap-2">
                    {niveis.map((nivel) => (
                      <Button
                        key={nivel.qualidade}
                        variant="outline"
                        onClick={() => void registrar(nivel.qualidade)}
                      >
                        {nivel.texto}
                      </Button>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
          </>
        )}
        {concluir.isPending && <p role="status">Salvando revisão…</p>}
        {concluir.error && (
          <p role="alert">
            {concluir.error.message || "Não foi possível salvar a revisão."}
          </p>
        )}
        <Button
          variant="ghost"
          disabled={concluir.isPending}
          onClick={aoFechar}
        >
          Voltar à agenda
        </Button>
      </CardContent>
    </Card>
  );
}
