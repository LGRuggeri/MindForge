'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useModulo, useMarcarProgressoModulo } from '@/lib/hooks/useModulos';
import { useConteudos, useGerarConteudo } from '@/lib/hooks/useConteudos';
import { useExercicios, useGerarExercicio, useSubmeterTentativa } from '@/lib/hooks/useExercicios';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, Dumbbell, FileText, CheckCircle, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const TIPOS_EXERCICIO = [
  { value: 'questao_objetiva', label: 'Questão objetiva' },
  { value: 'dissertativa', label: 'Dissertativa' },
  { value: 'codigo', label: 'Código' },
  { value: 'projeto', label: 'Projeto' },
] as const;

type TipoExercicio = (typeof TIPOS_EXERCICIO)[number]['value'];

export default function ModuloPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : null;
  const { perfilSelecionado } = useAppStore();

  const { data: modulo, isLoading: moduloLoading } = useModulo(id);
  const { data: conteudos } = useConteudos(id);
  const { data: exercicios } = useExercicios(id);

  const gerarConteudo = useGerarConteudo();
  const gerarExercicio = useGerarExercicio();
  const marcarProgresso = useMarcarProgressoModulo();
  const submeterTentativa = useSubmeterTentativa();

  const [topico, setTopico] = useState('');
  const [tipoExercicio, setTipoExercicio] = useState<TipoExercicio>('questao_objetiva');
  const [resposta, setResposta] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const handleGerarConteudo = async () => {
    if (!id) return;
    try {
      await gerarConteudo.mutateAsync({ moduloId: id, topico: topico || modulo?.titulo || '' });
      toast.success('Conteúdo gerado com sucesso');
      setTopico('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar conteúdo');
    }
  };

  const handleGerarExercicio = async () => {
    if (!id) return;
    try {
      await gerarExercicio.mutateAsync({ moduloId: id, tipo: tipoExercicio });
      toast.success('Exercício gerado com sucesso');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar exercício');
    }
  };

  const handleMarcarConcluido = async () => {
    if (!id || !perfilSelecionado) {
      toast.error('Selecione um perfil');
      return;
    }
    try {
      await marcarProgresso.mutateAsync({ moduloId: id, perfilId: perfilSelecionado.id });
      toast.success('Módulo marcado como concluído');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar progresso');
    }
  };

  const handleSubmeterTentativa = async (exercicioId: string) => {
    if (!perfilSelecionado) {
      toast.error('Selecione um perfil');
      return;
    }
    try {
      const resultado = await submeterTentativa.mutateAsync({
        exercicioId,
        respostaUsuario: resposta[exercicioId] || '',
        perfilId: perfilSelecionado.id,
      });
      setFeedback((prev) => ({
        ...prev,
        [exercicioId]: `${resultado.correta ? 'Correto!' : 'Incorreto.'} ${resultado.feedbackIa || ''}`,
      }));
      toast.success(resultado.correta ? 'Resposta correta!' : 'Resposta incorreta');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao submeter resposta');
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link
              href={
                modulo.trilha?.objetivoId
                  ? `/objetivos/${modulo.trilha.objetivoId}`
                  : '/objetivos'
              }
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{modulo.titulo}</h1>
            {modulo.objetivoAprendizagem && (
              <p className="text-muted-foreground">{modulo.objetivoAprendizagem}</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarcarConcluido}
          disabled={marcarProgresso.isPending}
        >
          {marcarProgresso.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Concluir
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Ordem {modulo.ordem}</Badge>
        {modulo.tempoEstimadoMin && (
          <Badge variant="secondary">{modulo.tempoEstimadoMin} min</Badge>
        )}
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
        </TabsList>

        <TabsContent value="conteudo" className="space-y-4">
          {conteudos && conteudos.length > 0 ? (
            conteudos.map((conteudo) => (
              <Card key={conteudo.id}>
                <CardHeader>
                  <CardTitle>{conteudo.titulo}</CardTitle>
                  <CardDescription>
                    Status: <Badge variant="outline">{conteudo.status}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
                  <ReactMarkdown>{conteudo.corpoMarkdown}</ReactMarkdown>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Gerar conteúdo
                </CardTitle>
                <CardDescription>
                  O Synthesizer criará material didático para este módulo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topico">Tópico</Label>
                  <Input
                    id="topico"
                    value={topico}
                    onChange={(e) => setTopico(e.target.value)}
                    placeholder={modulo.titulo}
                  />
                </div>
                <Button onClick={handleGerarConteudo} disabled={gerarConteudo.isPending}>
                  {gerarConteudo.isPending ? 'Gerando...' : 'Gerar conteúdo'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="exercicios" className="space-y-4">
          {exercicios && exercicios.length > 0 ? (
            exercicios.map((exercicio) => (
              <Card key={exercicio.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{exercicio.enunciado}</CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {exercicio.tipo}
                    </Badge>
                  </div>
                  <CardDescription>Dificuldade: {exercicio.dificuldade}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="Digite sua resposta..."
                    value={resposta[exercicio.id] || ''}
                    onChange={(e) =>
                      setResposta((prev) => ({ ...prev, [exercicio.id]: e.target.value }))
                    }
                  />
                  <Button
                    onClick={() => handleSubmeterTentativa(exercicio.id)}
                    disabled={submeterTentativa.isPending || !resposta[exercicio.id]}
                  >
                    Submeter resposta
                  </Button>
                  {feedback[exercicio.id] && (
                    <div className="rounded-lg bg-muted p-3 text-sm">
                      {feedback[exercicio.id]}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
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
                    value={tipoExercicio}
                    onValueChange={(value) => setTipoExercicio(value as TipoExercicio)}
                  >
                    <SelectTrigger id="tipo" className="w-full">
                      <SelectValue placeholder="Selecione o tipo de exercício" />
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
                <Button onClick={handleGerarExercicio} disabled={gerarExercicio.isPending}>
                  {gerarExercicio.isPending ? 'Gerando...' : 'Gerar exercício'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
