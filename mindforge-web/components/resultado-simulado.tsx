import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarkdownViewer } from "@/components/markdown-viewer";
import type { ResultadoAvaliacao } from "@/types/api";

export function ResultadoSimulado({
  resultado,
}: {
  resultado: ResultadoAvaliacao;
}) {
  const nota = Number(resultado.pontuacaoTotal);
  return (
    <section aria-labelledby="titulo-resultado" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 id="titulo-resultado">Resultado do simulado</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nota final</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">
            <span>
              {Number.isFinite(nota)
                ? nota.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "Indisponível"}
            </span>
            <span className="ml-2 text-base font-normal text-muted-foreground">
              / 10
            </span>
          </p>
        </CardContent>
      </Card>
      {[
        { titulo: "Pontos fortes", itens: resultado.pontosFortes },
        { titulo: "Pontos a revisar", itens: resultado.pontosFracos },
        { titulo: "Recomendações", itens: resultado.recomendacoes },
      ].map(({ titulo, itens }) => (
        <Card key={titulo}>
          <CardHeader>
            <CardTitle>
              <h3>{titulo}</h3>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {itens.length ? (
              <ul className="space-y-3">
                {itens.map((item, indice) => (
                  <li
                    key={indice}
                    className="prose prose-sm min-w-0 max-w-none break-words dark:prose-invert"
                  >
                    <MarkdownViewer>{item}</MarkdownViewer>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum item registrado.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
      <Button asChild variant="outline">
        <Link href="/revisao">Consultar revisões</Link>
      </Button>
    </section>
  );
}
