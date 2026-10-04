import type { AlternativaQuestao } from "@/lib/alternativas-questao";
import { cn } from "@/lib/utils";

export function AlternativasQuestao({
  questaoId,
  numero,
  alternativas,
  selecionada,
  desabilitado,
  onSelecionar,
}: {
  questaoId: string;
  numero: number;
  alternativas: AlternativaQuestao[];
  selecionada?: string;
  desabilitado: boolean;
  onSelecionar: (letra: string) => void;
}) {
  return (
    <fieldset disabled={desabilitado} className="min-w-0 space-y-3">
      <legend className="sr-only">Alternativas da questão {numero}</legend>
      {alternativas.map((opcao) => (
        <label
          key={opcao.letra}
          className={cn(
            "flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
            selecionada === opcao.letra
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50",
            desabilitado && "cursor-default",
          )}
        >
          <input
            type="radio"
            name={`questao-${questaoId}`}
            value={opcao.letra}
            checked={selecionada === opcao.letra}
            onChange={() => onSelecionar(opcao.letra)}
            className="mt-1 size-4 shrink-0 accent-primary"
          />
          <span className="min-w-0 whitespace-pre-line break-words text-sm leading-relaxed">
            <strong>{opcao.letra}.</strong> {opcao.texto}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function CorrecaoAlternativas({
  alternativas,
  selecionada,
  gabarito,
}: {
  alternativas: AlternativaQuestao[];
  selecionada: string | null;
  gabarito?: string;
}) {
  return (
    <ul className="space-y-3" aria-label="Alternativas e correção">
      {alternativas.map((opcao) => {
        const marcada = opcao.letra === selecionada;
        const correta = opcao.letra === gabarito;
        return (
          <li
            key={opcao.letra}
            className={cn(
              "rounded-lg border p-4 text-sm",
              correta && "border-emerald-600 bg-emerald-500/10",
              marcada &&
                gabarito &&
                !correta &&
                "border-destructive bg-destructive/5",
            )}
          >
            <p className="whitespace-pre-line break-words leading-relaxed">
              <strong>{opcao.letra}.</strong> {opcao.texto}
            </p>
            {(marcada || correta) && (
              <div className="mt-2 flex flex-wrap gap-3 font-semibold">
                {marcada && <span>Você marcou</span>}
                {correta && <span>Resposta correta</span>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
