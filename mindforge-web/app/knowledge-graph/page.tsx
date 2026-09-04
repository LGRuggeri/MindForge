'use client';

import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useGrafoDoPerfil, useProximosPassos, useGrafoVisual } from '@/lib/hooks/useKnowledgeGraph';
import { KnowledgeGraphFlow } from '@/components/knowledge-graph/graph-flow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Network, Target, BookOpen, GitFork } from 'lucide-react';

export default function KnowledgeGraphPage() {
  const { perfilSelecionado } = useAppStore();
  const { data: grafo, isLoading: grafoLoading } = useGrafoDoPerfil(
    perfilSelecionado?.id || null,
  );
  const { data: grafoVisual, isLoading: grafoVisualLoading } = useGrafoVisual(
    perfilSelecionado?.id || null,
  );
  const { data: proximos, isLoading: proximosLoading } = useProximosPassos(
    perfilSelecionado?.id || null,
  );

  if (!perfilSelecionado) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <Network className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Selecione um perfil</h1>
        <Button asChild>
          <Link href="/perfis">Ir para perfis</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grafo de competências</h1>
        <p className="text-muted-foreground">Visualize seu progresso e próximos passos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Próximos passos recomendados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {proximosLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : proximos && proximos.length > 0 ? (
            proximos.map((competencia) => (
              <div
                key={competencia.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{competencia.nome}</p>
                  {competencia.descricao && (
                    <p className="text-sm text-muted-foreground">{competencia.descricao}</p>
                  )}
                </div>
                <Badge variant={competencia.progresso ? 'default' : 'outline'}>
                  {competencia.progresso?.nivelAtual || 'não iniciado'}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma recomendação no momento.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitFork className="h-5 w-5" />
            Mapa de competências
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="grafo" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="grafo" className="flex items-center gap-1">
                <Network className="h-4 w-4" />
                Grafo
              </TabsTrigger>
              <TabsTrigger value="lista" className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                Lista
              </TabsTrigger>
            </TabsList>

            <TabsContent value="grafo">
              {grafoVisualLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : grafoVisual ? (
                <KnowledgeGraphFlow nodes={grafoVisual.nodes} edges={grafoVisual.edges} />
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum dado de grafo disponível.</p>
              )}
            </TabsContent>

            <TabsContent value="lista">
              {grafoLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : grafo && grafo.length > 0 ? (
                <div className="space-y-3">
                  {grafo.map((competencia) => (
                    <div
                      key={competencia.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">{competencia.nome}</p>
                        {competencia.categoria && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {competencia.categoria}
                          </p>
                        )}
                      </div>
                      <Badge variant={competencia.progresso ? 'default' : 'outline'}>
                        {competencia.progresso?.nivelAtual || 'não iniciado'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma competência registrada ainda.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
