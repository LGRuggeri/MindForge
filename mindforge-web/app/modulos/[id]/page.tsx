"use client";

import { ExecutorCodigo } from "@/components/executor-codigo";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useModulo, useMarcarProgressoModulo } from "@/lib/hooks/useModulos";
import { useConteudos, useGerarConteudo } from "@/lib/hooks/useConteudos";
import {
  useExercicios,
  useGerarExercicio,
  useSubmeterTentativa,
} from "@/lib/hooks/useExercicios";
import { useProjetos, useGerarProjeto } from "@/lib/hooks/useProjetos";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Dumbbell,
  FileText,
  CheckCircle,
  Loader2,
  FolderKanban,
} from "lucide-react";
import { MarkdownViewer } from "@/components/markdown-viewer";

const VARIANTE_STATUS_CONTEUDO: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  gerado: "default",
  revisado: "secondary",
  pendente: "outline",
};

const TIPOS_EXERCICIO = [
  { value: "questao_objetiva", label: "Questão objetiva" },
  { value: "dissertativa", label: "Dissertativa" },
  { value: "codigo", label: "Código" },
  { value: "projeto", label: "Projeto" },
] as const;

type TipoExercicio = (typeof TIPOS_EXERCICIO)[number]["value"];

export default function ModuloPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : null;
  const { perfilSelecionado } = useAppStore();

  const { data: modulo, isLoading: moduloLoading } = useModulo(id);
  const { data: conteudos } = useConteudos(id);
  const { data: exercicios } = useExercicios(id);
  const { data: projetos } = useProjetos(id, null);

  const gerarConteudo = useGerarConteudo();
  const gerarExercicio = useGerarExercicio();
  const gerarProjeto = useGerarProjeto();
  const marcarProgresso = useMarcarProgressoModulo();
  const submeterTentativa = useSubmeterTentativa();

  const [topico, setTopico] = useState("");
  const [tipoExercicio, setTipoExercicio] =
    useState<TipoExercicio>("questao_objetiva");
  const [resposta, setResposta] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const handleGerarConteudo = async () => {
    if (!id || gerarConteudo.isPending) return;
    try {
      await gerarConteudo.mutateAsync({
        moduloId: id,
        topico: topico.trim() || modulo?.titulo || "",
      });
      toast.success("Conteúdo gerado com sucesso");
      setTopico("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao gerar conteúdo",
      );
    }
  };

  const handleGerarExercicio = async () => {
    if (!id || gerarExercicio.isPending) return;
    try {
      await gerarExercicio.mutateAsync({ moduloId: id, tipo: tipoExercicio });
      toast.success("Exercício gerado com sucesso");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao gerar exercício",
      );
    }
  };

  const handleMarcarConcluido = async () => {
    if (!id || !perfilSelecionado) {
      toast.error("Selecione um perfil");
      return;
    }
    try {
      await marcarProgresso.mutateAsync({
        moduloId: id,
        perfilId: perfilSelecionado.id,
      });
      toast.success("Módulo marcado como concluído");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar progresso",
      );
    }
  };

  const handleGerarProjeto = async () => {
    if (gerarProjeto.isPending) return;
    if (!id || !perfilSelecionado) {
      toast.error("Selecione um perfil");
      return;
    }
    try {
      await gerarProjeto.mutateAsync({
        moduloId: id,
        perfilId: perfilSelecionado.id,
      });
      toast.success("Projeto inteligente gerado!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao gerar projeto",
      );
    }
  };

  const handleSubmeterTentativa = async (exercicioId: string) => {
    if (!perfilSelecionado) {
      toast.error("Selecione um perfil");
      return;
    }
    try {
      const resultado = await submeterTentativa.mutateAsync({
        exercicioId,
        respostaUsuario: resposta[exercicioId] || "",
        perfilId: perfilSelecionado.id,
      });
      setFeedback((prev) => ({
        ...prev,
        [exercicioId]: `${resultado.correta ? "Correto!" : "Incorreto."} ${resultado.feedbackIa || ""}`,
      }));
      toast.success(
        resultado.correta ? "Resposta correta!" : "Resposta incorreta",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao submeter resposta",
      );
    }
  };

  if (moduloLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!modulo) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Módulo não encontrado</h1>
        <Button asChild variant="outline">
          <Link href="/objetivos">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" className="mt-1" asChild>
            <Link
              href={
                modulo.trilha?.objetivoId
                  ? `/objetivos/${modulo.trilha.objetivoId}`
                  : "/objetivos"
              }
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {modulo.titulo}
            </h1>
            {modulo.objetivoAprendizagem && (
              <p className="text-muted-foreground">
                {modulo.objetivoAprendizagem}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">Ordem {modulo.ordem}</Badge>
              {modulo.tempoEstimadoMin && (
                <Badge variant="secondary">{modulo.tempoEstimadoMin} min</Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarcarConcluido}
          disabled={marcarProgresso.isPending || modulo.status === "concluido"}
        >
          {marcarProgresso.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          {modulo.status === "concluido" ? "Concluído" : "Concluir"}
        </Button>
      </div>

      <Tabs defaultValue="conteudo">
        <TabsList>
          <TabsTrigger value="conteudo" className="gap-2">
            <FileText className="h-4 w-4" />
            Conteúdo
          </TabsTrigger>
          <TabsTrigger value="exercicios" className="gap-2">
            <Dumbbell className="h-4 w-4" />
            Exercícios
          </TabsTrigger>
          <TabsTrigger value="projetos" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            Projetos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conteudo" className="space-y-4">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Gerar conteúdo
              </CardTitle>
              <CardDescription>
                Crie material didático para este módulo. Os conteúdos anteriores
                serão mantidos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topico">Tópico</Label>
                <Input
                  id="topico"
                  disabled={gerarConteudo.isPending}
                  value={topico}
                  onChange={(e) => setTopico(e.target.value)}
                  placeholder={modulo.titulo}
                />
              </div>
              <Button
                onClick={handleGerarConteudo}
                disabled={gerarConteudo.isPending}
              >
                {gerarConteudo.isPending ? "Gerando..." : "Gerar conteúdo"}
              </Button>
            </CardContent>
          </Card>
          {conteudos?.map((conteudo) => (
            <Card key={conteudo.id}>
              <CardHeader>
                <CardTitle>{conteudo.titulo}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  Status:
                  <Badge
                    variant={
                      VARIANTE_STATUS_CONTEUDO[conteudo.status] ?? "outline"
                    }
                  >
                    {conteudo.status}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-neutral max-w-none dark:prose-invert">
                <MarkdownViewer>{conteudo.corpoMarkdown}</MarkdownViewer>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="exercicios" className="space-y-4">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Gerar exercício
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  disabled={gerarExercicio.isPending}
                  value={tipoExercicio}
                  onValueChange={(value) =>
                    setTipoExercicio(value as TipoExercicio)
                  }
                >
                  <SelectTrigger id="tipo" className="w-full">
                    <SelectValue>
                      {(valor: string | null) =>
                        TIPOS_EXERCICIO.find((t) => t.value === valor)?.label ??
                        "Selecione o tipo de exercício"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_EXERCICIO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGerarExercicio}
                disabled={gerarExercicio.isPending}
              >
                {gerarExercicio.isPending ? "Gerando..." : "Gerar exercício"}
              </Button>
            </CardContent>
          </Card>
          {exercicios?.map((exercicio) => (
            <Card key={exercicio.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="prose prose-sm max-w-none flex-1 dark:prose-invert">
                    <MarkdownViewer>{exercicio.enunciado}</MarkdownViewer>
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {exercicio.tipo}
                  </Badge>
                </div>
                <CardDescription>
                  Dificuldade: {exercicio.dificuldade}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Digite sua resposta..."
                  aria-label={
                    exercicio.tipo === "codigo"
                      ? "Código do exercício"
                      : "Resposta do exercício"
                  }
                  className={
                    exercicio.tipo === "codigo"
                      ? "min-h-40 font-mono"
                      : undefined
                  }
                  value={resposta[exercicio.id] || ""}
                  onChange={(e) =>
                    setResposta((prev) => ({
                      ...prev,
                      [exercicio.id]: e.target.value,
                    }))
                  }
                />
                {exercicio.tipo === "codigo" && (
                  <ExecutorCodigo
                    key={`${exercicio.id}:${perfilSelecionado?.id}`}
                    exercicioId={exercicio.id}
                    perfilId={perfilSelecionado?.id ?? null}
                    codigo={resposta[exercicio.id] || ""}
                    disabled={submeterTentativa.isPending}
                  />
                )}
                <Button
                  onClick={() => handleSubmeterTentativa(exercicio.id)}
                  disabled={
                    submeterTentativa.isPending || !resposta[exercicio.id]
                  }
                >
                  Submeter resposta
                </Button>
                {feedback[exercicio.id] && (
                  <div
                    className={`rounded-lg border p-3 text-sm ${
                      feedback[exercicio.id].startsWith("Correto")
                        ? "border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                        : "border-rose-500/40 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
                    }`}
                  >
                    {feedback[exercicio.id]}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="projetos" className="space-y-4">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Gerar projeto inteligente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Crie um projeto prático para este módulo. Os projetos anteriores
                serão mantidos.
              </p>
              <Button
                onClick={handleGerarProjeto}
                disabled={gerarProjeto.isPending || !perfilSelecionado}
              >
                {gerarProjeto.isPending ? "Gerando..." : "Gerar projeto"}
              </Button>
            </CardContent>
          </Card>
          {projetos?.map((projeto) => (
            <Card key={projeto.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{projeto.titulo}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {projeto.descricao}
                    </p>
                    <Badge variant="outline" className="mt-2 capitalize">
                      {projeto.status}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/projetos/${projeto.id}`}>
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
