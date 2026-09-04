'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useObjetivo } from '@/lib/hooks/useObjetivos';
import { useGerarTrilha } from '@/lib/hooks/useTrilhas';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, Play } from 'lucide-react';

export default function ObjetivoPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : null;
  const { data: objetivo, isLoading } = useObjetivo(id);
  const gerar = useGerarTrilha();
  const { perfilSelecionado } = useAppStore();

  const handleGerarTrilha = async () => {
    if (!id || !perfilSelecionado) return;
    try {
      const trilha = await gerar.mutateAsync({ objetivoId: id });
      toast.success(`Trilha "${trilha.id.slice(0, 8)}" gerada com ${trilha.modulos.length} módulos`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar trilha');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!objetivo) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Objetivo não encontrado</h1>
        <Button asChild variant="outline">
          <Link href="/objetivos">Voltar</Link>
        </Button>
      </div>
    );
  }

  const trilha = objetivo.trilhas?.[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/objetivos">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{objetivo.titulo}</h1>
          {objetivo.descricao && (
            <p className="text-muted-foreground">{objetivo.descricao}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {objetivo.nivelDesejado && (
          <Badge variant="outline" className="capitalize">
            {objetivo.nivelDesejado}
          </Badge>
        )}
        {objetivo.prazoEstimado && (
          <Badge variant="secondary">
            Prazo: {new Date(objetivo.prazoEstimado).toLocaleDateString('pt-BR')}
          </Badge>
        )}
      </div>

      {!trilha ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Gerar trilha de aprendizado
            </CardTitle>
            <CardDescription>
              Use o agente Planner para criar uma trilha personalizada com módulos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGerarTrilha} disabled={gerar.isPending}>
              {gerar.isPending ? 'Gerando...' : 'Gerar trilha'}
              <Play className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Módulos da trilha</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGerarTrilha}
              disabled={gerar.isPending}
            >
              {gerar.isPending ? 'Gerando...' : 'Regenerar trilha'}
            </Button>
          </div>
          {trilha.modulos?.map((modulo) => (
            <Card key={modulo.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                        {modulo.ordem}
                      </span>
                      <h3 className="font-semibold">{modulo.titulo}</h3>
                    </div>
                    {modulo.objetivoAprendizagem && (
                      <CardDescription className="mb-2">
                        {modulo.objetivoAprendizagem}
                      </CardDescription>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {modulo.tempoEstimadoMinutos && (
                        <span>{modulo.tempoEstimadoMinutos} min</span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/modulos/${modulo.id}`}>
                      <Play className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
