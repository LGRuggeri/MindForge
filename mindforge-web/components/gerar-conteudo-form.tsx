"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useGerarConteudo } from "@/lib/hooks/useConteudos";
import type { EscopoEstudo, GerarConteudoInput } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const modos = [
  { valor: "completo", nome: "Aula completa" },
  { valor: "concurso", nome: "Preparação para concurso" },
  { valor: "resumo", nome: "Resumo para revisão" },
] as const;

export function GerarConteudoForm({
  moduloId,
  titulo,
  escopo,
}: {
  moduloId: string;
  titulo: string;
  escopo?: EscopoEstudo;
}) {
  const gerar = useGerarConteudo();
  const [topico, setTopico] = useState("");
  const [modo, setModo] = useState<
    NonNullable<GerarConteudoInput["modoEstudo"]>
  >(escopo?.modoEstudoPadrao ?? "completo");
  const [topicos, setTopicos] = useState("");
  const [atualizarFontes, setAtualizarFontes] = useState(true);
  const [erroGeracao, setErroGeracao] = useState<string | null>(null);
  const enviar = async () => {
    if (gerar.isPending) return;
    const obrigatorios = [
      ...new Set(
        topicos
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
    if (
      obrigatorios.length > 20 ||
      obrigatorios.some((item) => item.length > 300)
    ) {
      toast.error("Informe até 20 tópicos, com no máximo 300 caracteres cada.");
      return;
    }
    try {
      setErroGeracao(null);
      const resultado = await gerar.mutateAsync({
        moduloId,
        topico: topico.trim() || titulo,
        modoEstudo: modo,
        atualizarFontes,
        ...(obrigatorios.length ? { topicosObrigatorios: obrigatorios } : {}),
      });
      if (resultado.status === "rascunho")
        toast.error("Conteúdo salvo como rascunho: a revisão apontou lacunas.");
      else toast.success("Conteúdo gerado com sucesso");
      setTopico("");
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Erro ao gerar conteúdo";
      setErroGeracao(mensagem);
      toast.error(mensagem);
    }
  };
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>Gerar conteúdo</CardTitle>
        <CardDescription>
          Pesquise fontes atuais e gere uma nova aula dentro dos tópicos da grade.
          Os materiais anteriores serão mantidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {escopo && (
          <div className="rounded-lg border p-3 space-y-2">
            <p className="font-medium">
              Tópicos da grade — {escopo.programaNome}
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {escopo.topicosObrigatorios.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Estes tópicos orientam a geração e a revisão da aula. Você pode
              acrescentar um foco de estudo abaixo.
            </p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="topico">Tópico</Label>
          <Input
            id="topico"
            value={topico}
            maxLength={500}
            disabled={gerar.isPending}
            onChange={(event) => setTopico(event.target.value)}
            placeholder={titulo}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="modo-estudo">Formato de estudo</Label>
          <Select
            value={modo}
            disabled={gerar.isPending}
            onValueChange={(valor) => {
              if (modos.some((item) => item.valor === valor))
                setModo(valor as typeof modo);
            }}
          >
            <SelectTrigger id="modo-estudo">
              <SelectValue>
                {modos.find((item) => item.valor === modo)?.nome}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {modos.map((item) => (
                <SelectItem key={item.valor} value={item.valor}>
                  {item.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="topicos-obrigatorios">
            {escopo
              ? "Tópicos adicionais (opcional)"
              : "Tópicos obrigatórios (opcional)"}
          </Label>
          <Textarea
            id="topicos-obrigatorios"
            value={topicos}
            disabled={gerar.isPending}
            onChange={(event) => setTopicos(event.target.value)}
            placeholder="Um tópico por linha, até 20"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={atualizarFontes} disabled={gerar.isPending}
              onChange={(event) => setAtualizarFontes(event.target.checked)} />
            Pesquisar fontes na web antes de gerar
          </label>
          <p className="text-sm text-muted-foreground">
            {atualizarFontes
              ? "A busca acontece nesta geração. Links e trechos encontrados não comprovam a vigência de uma norma."
              : "A aula usará apenas as referências já salvas, sem pesquisa atualizada nesta geração."}
          </p>
        </div>
        {erroGeracao && <p role="alert" className="text-sm text-destructive">{erroGeracao}</p>}
        <Button onClick={enviar} disabled={gerar.isPending}>
          {gerar.isPending ? "Gerando..." : atualizarFontes ? "Pesquisar e gerar conteúdo" : "Gerar com fontes salvas"}
        </Button>
      </CardContent>
    </Card>
  );
}
