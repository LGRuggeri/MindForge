'use client';

import { TrilhaComModulos } from '@/types/api';
import { ModuloCard } from './modulo-card';

interface TrilhaTimelineProps {
  trilha: TrilhaComModulos;
}

export function TrilhaTimeline({ trilha }: TrilhaTimelineProps) {
  const modulos = trilha.modulos || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Módulos da trilha</h2>
        <span className="text-sm text-muted-foreground">{modulos.length} módulos</span>
      </div>
      <div className="relative space-y-4 pl-4 border-l border-border">
        {modulos.map((modulo) => (
          <div key={modulo.id} className="relative">
            <span className="absolute -left-[21px] top-6 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
            <ModuloCard modulo={modulo} href={`/modulos/${modulo.id}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
