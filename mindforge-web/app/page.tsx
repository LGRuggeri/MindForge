'use client';

import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useObjetivos } from '@/lib/hooks/useObjetivos';
import { useProximosPassos } from '@/lib/hooks/useKnowledgeGraph';
import { useRevisoes } from '@/lib/hooks/useRevisao';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, BookOpen, Repeat, Network, ArrowRight, User } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardPage() {
  const { perfilSelecionado } = useAppStore();
  const { data: objetivos, isLoading: objetivosLoading } = useObjetivos(perfilSelecionado?.id || null);
  const { data: proximos, isLoading: proximosLoading } = useProximosPassos(
    perfilSelecionado?.id || null,
  );
  const { data: revisoes } = useRevisoes(perfilSelecionado?.id || null);

  const revisoesPendentes =
    revisoes?.filter((r) => isPast(parseISO(r.proximaRevisao))) ?? [];

  if (!perfilSelecionado) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <User className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Bem-vindo ao MindForge</h1>
        <p className="text-muted-foreground max-w-md mb-6">
          Selecione ou crie um perfil no menu superior para começar a estudar.
        </p>
        <Button asChild>
          <Link href="/perfis">Gerenciar perfis</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Olá, {perfilSelecionado.nome}. Aqui está o resumo da sua jornada de aprendizado.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Objetivos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {objetivosLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{objetivos?.length ?? 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trilhas ativas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {objetivosLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {objetivos?.reduce((acc, o) => acc + (o.trilhas?.length ?? 0), 0) ?? 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revisões pendentes</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revisoesPendentes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Próximos passos</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {proximosLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{proximos?.length ?? 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Objetivos recentes</CardTitle>
            <CardDescription>Seus objetivos de estudo ativos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {objetivosLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : objetivos && objetivos.length > 0 ? (
              objetivos.slice(0, 5).map((objetivo) => (
                <div
                  key={objetivo.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{objetivo.titulo}</p>
                    {objetivo.descricao && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {objetivo.descricao}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/objetivos/${objetivo.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum objetivo criado ainda.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas revisões</CardTitle>
            <CardDescription>Itens agendados para revisão.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {revisoesPendentes.length > 0 ? (
              revisoesPendentes.slice(0, 5).map((revisao) => (
                <div
                  key={revisao.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium capitalize">{revisao.itemTipo}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(revisao.proximaRevisao), "dd 'de' MMMM", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <Badge variant={isPast(parseISO(revisao.proximaRevisao)) ? 'destructive' : 'outline'}>
                    {isPast(parseISO(revisao.proximaRevisao)) ? 'Atrasada' : 'Agendada'}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma revisão pendente.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
