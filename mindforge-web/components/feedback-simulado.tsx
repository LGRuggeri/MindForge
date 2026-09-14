import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownViewer } from "@/components/markdown-viewer";
import type { ResultadoAvaliacao } from "@/types/api";

export function FeedbackSimulado({
  resultado,
}: {
  resultado: ResultadoAvaliacao;
}) {
  const legado = resultado.feedbackExercicios == null;
  const itens =
    resultado.feedbackExercicios ?? resultado.historicoTentativas ?? [];
  return (
    <section aria-labelledby="titulo-feedback" className="min-w-0 space-y-4">
      <h3 id="titulo-feedback" className="text-lg font-semibold">
        {legado ? "Histórico de correções" : "Correção por exercício"}
      </h3>
      {legado && (
        <p className="text-sm text-muted-foreground">
          Este simulado foi finalizado antes do registro das respostas usadas na
          nota. O histórico abaixo mostra as correções disponíveis; não é
          possível identificar quais tentativas compuseram a nota final.
        </p>
      )}
      {itens.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhuma correção individual disponível.
        </p>
      )}
      {itens.map((item, indice) => {
        const respondida = item.tentativaId !== null;
        const pontuacao =
          item.pontuacao === null ? null : Number(item.pontuacao);
        const estado = !respondida
          ? "Não respondida"
          : item.correta === true
            ? "Correta"
            : item.correta === false
              ? "Incorreta"
              : "Sem classificação";
        return (
          <Card key={item.tentativaId ?? item.exercicioId} className="min-w-0">
            <CardHeader>
              <CardTitle>
                <h4>
                  {legado ? "Resposta" : "Questão"} {indice + 1}
                </h4>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge
                  variant={item.correta === false ? "destructive" : "secondary"}
                >
                  {estado}
                </Badge>
                <span>
                  {pontuacao !== null && Number.isFinite(pontuacao)
                    ? `${pontuacao.toLocaleString("pt-BR")} / 10`
                    : "Pontuação indisponível"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 space-y-4">
              <div className="prose prose-sm min-w-0 max-w-none break-words dark:prose-invert">
                <MarkdownViewer>{item.enunciado}</MarkdownViewer>
              </div>
              {respondida && (
                <div>
                  <p className="mb-2 text-sm font-medium">Sua resposta</p>
                  <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-sm [overflow-wrap:anywhere]">
                    {item.respostaUsuario ?? "Resposta não registrada."}
                  </pre>
                </div>
              )}
              <div>
                <p className="mb-2 text-sm font-medium">Feedback</p>
                {item.feedbackIa ? (
                  <div className="prose prose-sm min-w-0 max-w-none break-words dark:prose-invert">
                    <MarkdownViewer>{item.feedbackIa}</MarkdownViewer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {respondida
                      ? "Feedback não registrado para esta resposta."
                      : "Questão não respondida; considerada com pontuação zero."}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
