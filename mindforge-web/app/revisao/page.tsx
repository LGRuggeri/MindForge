'use client';

import { useRevisoes } from '@/lib/hooks/useRevisao';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Repeat } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RevisaoPage() {
  const { data: revisoes, isLoading } = useRevisoes();

  const pendentes = revisoes?.filter((r) => isPast(parseISO(r.proximaRevisao))) ?? [];
  const futuras = revisoes?.filter((r) => !isPast(parseISO(r.proximaRevisao))) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revisão espaçada</h1>
        <p className="text-muted-foreground">Itens agendados para revisão com SM-2.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Revisões pendentes
          </CardTitle>
          <CardDescription>
            {pendentes.length} item{pendentes.length !== 1 ? 's' : ''} atrasado
            {pendentes.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : pendentes.length > 0 ? (
            pendentes.map((revisao) => (
              <div
                key={revisao.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium capitalize">{revisao.itemTipo}</p>
                  <p className="text-sm text-muted-foreground">
                    Próxima revisão:{' '}
                    {format(parseISO(revisao.proximaRevisao), "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <Badge variant="destructive">Atrasada</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma revisão pendente. Bom trabalho!</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Próximas revisões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : futuras.length > 0 ? (
            futuras.map((revisao) => (
              <div
                key={revisao.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium capitalize">{revisao.itemTipo}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(revisao.proximaRevisao), "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <Badge variant="outline">Agendada</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma revisão futura agendada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
