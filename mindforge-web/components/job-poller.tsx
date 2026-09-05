'use client';

import { useEffect, useRef } from 'react';
import { useJob } from '@/lib/hooks/useJobs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface JobPollerProps {
  nome: string;
  id: string;
  onComplete?: () => void;
}

export function JobPoller({ nome, id, onComplete }: JobPollerProps) {
  const { data: job } = useJob(nome, id, { refetchInterval: 2000 });

  const status = job?.status;
  const finalizado = status === 'completed' || status === 'failed' || status === 'cancelled';
  const onCompleteChamado = useRef(false);

  useEffect(() => {
    if (finalizado && onComplete && !onCompleteChamado.current) {
      onCompleteChamado.current = true;
      onComplete();
    }
  }, [finalizado, onComplete]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {status === 'completed' ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : status === 'failed' || status === 'cancelled' ? (
            <XCircle className="h-5 w-5 text-destructive" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin" />
          )}
          Job: {nome}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Status: {status || 'processando'}</p>
      </CardContent>
    </Card>
  );
}
