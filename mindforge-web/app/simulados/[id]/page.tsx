'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAvaliacao, useSubmeterAvaliacao } from '@/lib/hooks/useAvaliacoes';
import { useSubmeterTentativa } from '@/lib/hooks/useExercicios';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react';

export default function SimuladoPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : null;
  const { perfilSelecionado } = useAppStore();

  const { data: avaliacao, isLoading } = useAvaliacao(id);
  const submeterTentativa = useSubmeterTentativa();
  const submeterAvaliacao = useSubmeterAvaliacao();

  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [tentativas, setTentativas] = useState<Record<string, string>>({});
  const [submetendo, setSubmetendo] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
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

  if (!perfilSelecionado) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Selecione um perfil</h1>
        <p className="text-muted-foreground mb-6">
          Você precisa selecionar ou criar um perfil antes de responder o simulado.
        </p>
        <Button asChild>
          <Link href="/perfis">Ir para perfis</Link>
        </Button>
      </div>
    );
  }

  const itens = [...(avaliacao.exercicios ?? [])].sort((a, b) => a.ordem - b.ordem);
  const todosRespondidos = itens.every((item) => tentativas[item.exercicio.id]);

  const handleResponder = async (exercicioId: string) => {
    const resposta = respostas[exercicioId]?.trim();
    if (!resposta) {
      toast.error('Digite uma resposta antes de submeter.');
      return;
    }

    try {
      const tentativa = await submeterTentativa.mutateAsync({
        exercicioId,
        respostaUsuario: resposta,
        perfilId: perfilSelecionado?.id,
        avaliacaoId: id,
      });
      setTentativas((prev) => ({ ...prev, [exercicioId]: tentativa.id }));
      toast.success('Resposta registrada!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao submeter resposta');
    }
  };

  const handleFinalizar = async () => {
    if (!id) return;
    if (!todosRespondidos) {
      toast.error('Responda todos os exercícios antes de finalizar.');
      return;
    }

    setSubmetendo(true);
    try {
      await submeterAvaliacao.mutateAsync({
        avaliacaoId: id,
        perfilId: perfilSelecionado?.id,
        respostas: itens.map((item) => ({
          exercicioId: item.exercicio.id,
          tentativaId: tentativas[item.exercicio.id],
        })),
      });
      toast.success('Simulado finalizado!');
      router.push('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao finalizar simulado');
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
          <h1 className="text-3xl font-bold tracking-tight">{avaliacao.titulo}</h1>
          <p className="text-muted-foreground text-sm">
            {itens.length} questões · Responda todas antes de finalizar
          </p>
        </div>
      </div>

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
                <span className="leading-relaxed">{item.exercicio.enunciado}</span>
                {respondido && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{item.exercicio.tipo}</Badge>
                <Badge variant="secondary">{item.exercicio.dificuldade}</Badge>
              </div>
              <Textarea
                placeholder="Digite sua resposta..."
                value={respostas[exercicioId] ?? ''}
                onChange={(e) =>
                  setRespostas((prev) => ({ ...prev, [exercicioId]: e.target.value }))
                }
                disabled={respondido}
                className="min-h-[120px]"
              />
              <Button
                onClick={() => handleResponder(exercicioId)}
                disabled={respondido || submeterTentativa.isPending}
                size="sm"
              >
                <Send className="mr-2 h-4 w-4" />
                {respondido ? 'Respondido' : 'Submeter resposta'}
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
        <Button onClick={handleFinalizar} disabled={!todosRespondidos || submetendo} size="lg">
          {submetendo ? 'Finalizando...' : 'Finalizar simulado'}
        </Button>
      </div>
    </div>
  );
}
