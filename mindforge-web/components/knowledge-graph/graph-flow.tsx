'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge } from '@/components/ui/badge';
import type { GrafoVisualNode, GrafoVisualEdge } from '@/types/api';

const NIVEL_CORES: Record<string, { bg: string; border: string; text: string }> = {
  dominado: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    text: 'text-emerald-900',
  },
  praticando: {
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    text: 'text-blue-900',
  },
  aprendendo: {
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    text: 'text-amber-900',
  },
  nao_iniciado: {
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    text: 'text-slate-900',
  },
};

type CompetenciaNodeData = {
  node: GrafoVisualNode;
};

function CompetenciaNode({ data }: NodeProps) {
  const node = (data as CompetenciaNodeData).node;
  const cores = NIVEL_CORES[node.nivelAtual] ?? NIVEL_CORES.nao_iniciado;

  return (
    <div
      className={`min-w-[180px] max-w-[260px] rounded-xl border-2 p-3 shadow-sm ${cores.bg} ${cores.border}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <div className="flex flex-col gap-1">
        <p className={`text-sm font-semibold leading-tight ${cores.text}`}>{node.nome}</p>
        {node.categoria && (
          <Badge variant="secondary" className="w-fit text-[10px] capitalize">
            {node.categoria}
          </Badge>
        )}
        {node.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">{node.descricao}</p>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />
    </div>
  );
}

const nodeTypes = { competencia: CompetenciaNode };

interface KnowledgeGraphFlowProps {
  nodes: GrafoVisualNode[];
  edges: GrafoVisualEdge[];
}

export function KnowledgeGraphFlow({ nodes, edges }: KnowledgeGraphFlowProps) {
  const flowElements = useMemo(() => {
    const edgeTargets = new Map<string, string[]>();

    for (const edge of edges) {
      const list = edgeTargets.get(edge.target) ?? [];
      list.push(edge.source);
      edgeTargets.set(edge.target, list);
    }

    const profundidadePorId = new Map<string, number>();

    function calcularProfundidade(id: string, visitados = new Set<string>()): number {
      if (visitados.has(id)) return 0;
      visitados.add(id);

      const sources = edgeTargets.get(id) ?? [];
      if (sources.length === 0) return 0;

      return 1 + Math.max(...sources.map((s) => calcularProfundidade(s, new Set(visitados))));
    }

    for (const node of nodes) {
      profundidadePorId.set(node.id, calcularProfundidade(node.id));
    }

    const nodesPorProfundidade = new Map<number, GrafoVisualNode[]>();
    for (const node of nodes) {
      const p = profundidadePorId.get(node.id) ?? 0;
      const list = nodesPorProfundidade.get(p) ?? [];
      list.push(node);
      nodesPorProfundidade.set(p, list);
    }

    const posicaoPorId = new Map<string, { x: number; y: number }>();
    const espacamentoX = 280;
    const espacamentoY = 120;

    for (const [profundidade, lista] of nodesPorProfundidade.entries()) {
      const altura = (lista.length - 1) * espacamentoY;
      const centroY = altura / 2;

      lista.forEach((node, index) => {
        posicaoPorId.set(node.id, {
          x: profundidade * espacamentoX,
          y: index * espacamentoY - centroY,
        });
      });
    }

    const flowNodes: Node[] = nodes.map((node) => ({
      id: node.id,
      type: 'competencia',
      position: posicaoPorId.get(node.id) ?? { x: 0, y: 0 },
      data: { node } as Record<string, unknown>,
    }));

    const flowEdges: Edge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: 'arrowclosed', width: 12, height: 12 },
    }));

    return { flowNodes, flowEdges };
  }, [nodes, edges]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Nenhuma competência no grafo ainda.
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full rounded-lg border bg-card">
      <ReactFlow
        nodes={flowElements.flowNodes}
        edges={flowElements.flowEdges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
