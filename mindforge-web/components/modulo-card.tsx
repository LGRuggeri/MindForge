'use client';

import Link from 'next/link';
import { Modulo } from '@/types/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface ModuloCardProps {
  modulo: Modulo;
  href?: string;
}

export function ModuloCard({ modulo, href }: ModuloCardProps) {
  const content = (
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
            <p className="text-sm text-muted-foreground line-clamp-2">{modulo.objetivoAprendizagem}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {modulo.tempoEstimadoMin && (
              <Badge variant="secondary">{modulo.tempoEstimadoMin} min</Badge>
            )}
          </div>
        </div>
        {href && (
          <Button variant="ghost" size="icon" asChild>
            <Link href={href}>
              <Play className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </CardContent>
  );

  return <Card>{content}</Card>;
}
