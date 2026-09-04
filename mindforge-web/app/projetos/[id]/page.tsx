'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useProjeto, useSubmeterEntrega, useConcluirProjeto } from '@/lib/hooks/useProjetos';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Lightbulb, Loader2, Send } from 'lucide-react';

export default function ProjetoPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : null;
  const { perfilSelecionado } = useAppStore();

  const { data: projeto, isLoading } = useProjeto(id);
  const submeterEntrega = useSubmeterEntrega();
  const concluirProjeto = useConcluirProjeto();

  const [conteudo, setConteudo] = useState('');

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!projeto) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Projeto não encontrado</h1>
        <Button asChild variant="outline">
          <Link href="/">Voltar</Link>
        </Button>
      </div>
    );
  }

  const handleSubmeter = async () => {
    if (!id || !conteudo.trim()) {
      toast.error('Digite o conteúdo da entrega.');
      return;
    }

    try {
      await submeterEntrega.mutateAsync({
        projetoId: id,
        data: { conteudo },
        perfilId: perfilSelecionado?.id,
      });
      toast.success('Entrega submetida com sucesso!');
      setConteudo('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao submeter entrega');
    }
  };

  const handleConcluir = async () => {
    if (!id) {
      return;
    }

    try {
      await concluirProjeto.mutateAsync(id);
      toast.success('Projeto concluído!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao concluir projeto');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={projeto.moduloId ? `/modulos/${projeto.moduloId}` : '/'}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{projeto.titulo}</h1>
          <p className="text-muted-foreground text-sm capitalize">Status: {projeto.status}</p>
        </div>
        {projeto.status !== 'concluido' && (
          <Button
            variant="outline"
            className="ml-auto"
            onClick={handleConcluir}
            disabled={concluirProjeto.isPending}
          >
            {concluirProjeto.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Concluir projeto
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Descrição</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{projeto.descricao}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Critérios de avaliação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {projeto.criterios.map((criterio, index) => (
              <li key={index}>{criterio}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {projeto.dicas && projeto.dicas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Dicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {projeto.dicas.map((dica, index) => (
                <li key={index}>{dica}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nova entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Descreva sua entrega, link, explicação ou resolução..."
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            className="min-h-[160px]"
          />
          <Button
            onClick={handleSubmeter}
            disabled={submeterEntrega.isPending || !conteudo.trim()}
          >
            {submeterEntrega.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Submeter entrega
          </Button>
        </CardContent>
      </Card>

      {projeto.entregas && projeto.entregas.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Histórico de entregas</h2>
          {projeto.entregas
            .sort((a, b) => b.numeroEntrega - a.numeroEntrega)
            .map((entrega) => (
              <Card key={entrega.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    Entrega #{entrega.numeroEntrega}
                    {entrega.pontuacao && (
                      <Badge variant={Number(entrega.pontuacao) >= 7 ? 'default' : 'secondary'}>
                        Nota: {entrega.pontuacao}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="whitespace-pre-wrap text-sm">{entrega.conteudo}</p>
                  {entrega.feedback && (
                    <div className="rounded-lg bg-muted p-3 text-sm">
                      <p className="font-medium mb-1">Feedback:</p>
                      <p>{entrega.feedback}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
