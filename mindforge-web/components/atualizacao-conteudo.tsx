import type { Conteudo } from "@/types/api";

function dataLegivel(valor: string | null | undefined) {
  if (!valor) return "não registrada";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "não registrada" : data.toLocaleString("pt-BR");
}

export function AtualizacaoConteudo({ conteudo }: { conteudo: Conteudo }) {
  const pesquisa = conteudo.atualizacaoFontes;
  return (
    <div className="rounded-lg border p-3 text-sm space-y-1">
      <p>Material gerado em: {dataLegivel(conteudo.criadoEm)}.</p>
      {pesquisa?.tipo === "busca_web" ? (
        <>
          <p>Pesquisa web realizada em: {dataLegivel(pesquisa.realizadaEm)}. Fontes selecionadas: {pesquisa.fontesEncontradas}.</p>
          <p className="text-muted-foreground">A busca encontrou links e trechos; não comprova leitura integral das páginas nem vigência das normas.</p>
        </>
      ) : (
        <p className="text-muted-foreground">
          {pesquisa?.tipo === "fontes_salvas"
            ? "Gerado com fontes salvas, sem pesquisa web nesta geração."
            : "Este material não tem registro de pesquisa atualizada. Use o formulário acima para pesquisar e gerar uma nova aula."}
        </p>
      )}
    </div>
  );
}
