"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useProgramasTrilha } from "@/lib/hooks/useTrilhas";
import { useCriarObjetivo } from "@/lib/hooks/useObjetivos";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function ProgramasEstudo({ perfilId }: { perfilId: string }) {
  const { data: programas, isLoading, isError } = useProgramasTrilha();
  const criar = useCriarObjetivo();
  const [codigo, setCodigo] = useState("");
  const [indices, setIndices] = useState<number[]>([]);
  const [objetivoId, setObjetivoId] = useState<string>();
  const programa = programas?.find((p) => p.codigo === codigo);

  const selecionarPrograma = (valor: string) => {
    setCodigo(valor);
    setObjetivoId(undefined);
    setIndices(
      programas
        ?.find((p) => p.codigo === valor)
        ?.modulos.map((_, i) => i + 1) ?? [],
    );
  };
  const enviar = async () => {
    if (!programa || !indices.length || criar.isPending) return;
    try {
      const objetivo = await criar.mutateAsync({
        perfilId,
        titulo: programa.nome,
        descricao: programa.descricao,
        programaCodigo: programa.codigo,
        modulosIndices: [...indices].sort((a, b) => a - b),
      });
      setObjetivoId(objetivo.id);
      toast.success(
        "Sua trilha está pronta. Abra um módulo para gerar o conteúdo.",
      );
    } catch (erro) {
      toast.error(
        erro instanceof Error
          ? erro.message
          : "Não foi possível criar seu estudo",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grades de estudo</CardTitle>
        <CardDescription>
          Escolha os assuntos de um curso, concurso ou certificação. A grade organiza
          os módulos; em cada módulo você pode pesquisar fontes e gerar a aula.
          Sua trilha, seus conteúdos e suas avaliações ficam vinculados ao perfil selecionado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="programa-estudo">Programa de estudo</Label>
          <select
            id="programa-estudo"
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={codigo}
            disabled={isLoading || criar.isPending}
            onChange={(e) => selecionarPrograma(e.target.value)}
          >
            <option value="">
              {isLoading
                ? "Carregando programas..."
                : "Selecione uma grade de estudo"}
            </option>
            {programas?.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.nome}
              </option>
            ))}
          </select>
          {isError && (
            <p role="alert" className="text-sm text-destructive">
              Não foi possível carregar os programas. Atualize a página para
              tentar novamente.
            </p>
          )}
        </div>
        {programa && (
          <>
            <p className="text-sm text-muted-foreground">
              {programa.descricao}
            </p>
            <a
              href={programa.fonteOficial}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
            >
              Consultar programa de referência
            </a>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">
                {indices.length} de {programa.modulos.length} módulos
                selecionados
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={criar.isPending}
                onClick={() =>
                  setIndices(programa.modulos.map((_, i) => i + 1))
                }
              >
                Selecionar todos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={criar.isPending}
                onClick={() => setIndices([])}
              >
                Limpar seleção
              </Button>
            </div>
            <fieldset className="space-y-2" disabled={criar.isPending}>
              <legend className="mb-2 font-medium">Módulos da grade</legend>
              {programa.modulos.map((modulo, i) => (
                <label
                  key={i}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    checked={indices.includes(i + 1)}
                    onChange={(e) =>
                      setIndices(
                        e.target.checked
                          ? [...indices, i + 1]
                          : indices.filter((n) => n !== i + 1),
                      )
                    }
                  />
                  <span className="min-w-0 space-y-1">
                    <span className="block font-medium">
                      {i + 1}. {modulo.titulo}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {modulo.objetivoAprendizagem} · {modulo.tempoEstimadoMin}{" "}
                      min
                    </span>
                    {modulo.topicosObrigatorios?.length ? (
                      <span className="block text-xs text-muted-foreground">
                        {modulo.topicosObrigatorios.join(" · ")}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </fieldset>
            {objetivoId ? (
              <Button asChild>
                <Link href={`/objetivos/${objetivoId}`}>
                  Abrir minha trilha
                </Link>
              </Button>
            ) : (
              <Button
                disabled={!indices.length || criar.isPending}
                onClick={enviar}
              >
                {criar.isPending ? "Criando estudo..." : "Criar meu estudo"}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
