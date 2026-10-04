'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useObjetivo } from '@/lib/hooks/useObjetivos';
import { useProgramasTrilha, useGerarTrilha } from '@/lib/hooks/useTrilhas';
import { useCriarAvaliacao } from '@/lib/hooks/useAvaliacoes';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, Play, ClipboardList } from 'lucide-react';
import { parseDateOnlyLocal } from '@/lib/date-helpers';

export default function ObjetivoPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : null;
  const { data: objetivo, isLoading } = useObjetivo(id);
  const gerar = useGerarTrilha();
  const { data: programas } = useProgramasTrilha();
  const criarAvaliacao = useCriarAvaliacao();
  const { perfilSelecionado } = useAppStore();

  const [open, setOpen] = useState(false);
  const [quantidade, setQuantidade] = useState('10');

  const handleGerarTrilha = async (programaCodigo?: string, modulosIndices?: number[]) => {
    if (!id || !perfilSelecionado) return;
    try {
      const trilha = await gerar.mutateAsync({ objetivoId: id, programaCodigo, ...(modulosIndices ? { modulosIndices } : {}) });
      toast.success(`Trilha "${trilha.id.slice(0, 8)}" gerada com ${trilha.modulos.length} módulos`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar trilha');
    }
  };

  const handleCriarSimulado = async () => {
    const trilha = objetivo?.trilhas?.[0];
    if (!trilha || !perfilSelecionado) return;

    const qtd = Number(quantidade);
    if (Number.isNaN(qtd) || qtd < 1) {
      toast.error('Quantidade inválida');
      return;
    }

    try {
      const avaliacao = await criarAvaliacao.mutateAsync({
        trilhaId: trilha.id,
        titulo: `Simulado - ${objetivo.titulo}`,
        tipo: 'simulado',
        quantidade: qtd,
      });
      toast.success('Simulado criado!');
      setOpen(false);
      router.push(`/simulados/${avaliacao.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar simulado');
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

  if (!perfilSelecionado || perfilSelecionado.id !== objetivo.perfilId) {
    return <div className="max-w-4xl mx-auto text-center py-20 space-y-4">
      <h1 className="text-2xl font-bold">{perfilSelecionado ? 'Este objetivo pertence a outro perfil' : 'Selecione um perfil'}</h1>
      <p className="text-muted-foreground">Selecione o perfil responsável por este estudo ou volte aos seus objetivos.</p>
      <Button asChild variant="outline"><Link href="/objetivos">Voltar aos objetivos</Link></Button>
    </div>;
  }

  const trilha = objetivo.trilhas?.find((t) => t.status === 'ativa') ?? objetivo.trilhas?.[0];
  const programaDaTrilha = trilha?.metadata?.programa ?? trilha?.metadata?.certificacao;
  const programasExibidos = programas ?? (programaDaTrilha ? [programaDaTrilha] : []);

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
            Prazo: {parseDateOnlyLocal(objetivo.prazoEstimado).toLocaleDateString('pt-BR')}
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
            <Button onClick={() => void handleGerarTrilha()} disabled={gerar.isPending}>
              {gerar.isPending ? 'Gerando...' : 'Gerar trilha'}
              <Play className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Módulos da trilha</h2>
            <div className="flex items-center gap-2">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger
                  render={
                    <Button variant="outline" size="sm">
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Criar simulado
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar simulado</DialogTitle>
                    <DialogDescription>
                      Sorteie exercícios de vários módulos da trilha para testar seu conhecimento.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="quantidade">Quantidade de questões</Label>
                      <Input
                        id="quantidade"
                        type="number"
                        min={1}
                        value={quantidade}
                        onChange={(e) => setQuantidade(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCriarSimulado} disabled={criarAvaliacao.isPending}>
                      {criarAvaliacao.isPending ? 'Criando...' : 'Criar simulado'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleGerarTrilha(programaDaTrilha?.codigo, trilha?.metadata?.modulosIndices)}
                disabled={gerar.isPending}
              >
                {gerar.isPending ? 'Gerando...' : 'Regenerar trilha'}
              </Button>
            </div>
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
                      {modulo.tempoEstimadoMin && (
                        <span>{modulo.tempoEstimadoMin} min</span>
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

      {programasExibidos.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Trilhas guiadas</h2>
            <p className="text-sm text-muted-foreground">
              Escolha um assunto, concurso ou certificação para organizar seus estudos.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {programasExibidos.map((programa) => {
              const atual = programaDaTrilha?.codigo === programa.codigo;
              const certificacao = programa.tipo === 'certificacao' || programa.tipo === undefined;
              return (
                <Card key={programa.codigo}>
                  <CardHeader>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{certificacao ? 'Certificação' : programa.tipo === 'concurso' ? 'Concurso' : 'Assunto'}</Badge>
                      {atual && <Badge variant="secondary">Trilha atual</Badge>}
                    </div>
                    <CardTitle>{programa.nome}</CardTitle>
                    <CardDescription>{programa.descricao}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {programa.dominios.map((dominio) => (
                        <div key={dominio.codigo} className="flex justify-between gap-3 text-sm">
                          <span>{dominio.titulo}</span>
                          {dominio.pesoMinimo !== undefined && dominio.pesoMaximo !== undefined && (
                            <span className="whitespace-nowrap text-muted-foreground">
                              {dominio.pesoMinimo === dominio.pesoMaximo
                                ? `${dominio.pesoMinimo}%`
                                : `${dominio.pesoMinimo}–${dominio.pesoMaximo}%`}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        variant="outline"
                        className="h-auto whitespace-normal text-left"
                        onClick={() => void handleGerarTrilha(programa.codigo, atual ? trilha?.metadata?.modulosIndices : undefined)}
                        disabled={gerar.isPending}
                      >
                        {trilha ? `Gerar nova trilha ${programa.codigo}` : `Criar trilha ${programa.codigo}`}
                      </Button>
                      <a className="text-sm underline underline-offset-4" href={programa.fonteOficial} target="_blank" rel="noopener noreferrer">
                        {certificacao ? 'Programa da prova' : 'Referência principal'}
                      </a>
                      {programa.avaliacaoPratica && (
                        <a className="text-sm underline underline-offset-4" href={programa.avaliacaoPratica} target="_blank" rel="noopener noreferrer">
                          Avaliação prática oficial
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Fonte conferida em {parseDateOnlyLocal(programa.revisadoEm).toLocaleDateString('pt-BR')}.
                      {programa.vigenciaDesde && ` Programa vigente desde ${parseDateOnlyLocal(programa.vigenciaDesde).toLocaleDateString('pt-BR')}.`}
                      {atual && programaDaTrilha && programaDaTrilha.revisadoEm !== programa.revisadoEm && ` A trilha atual usa o programa revisado em ${parseDateOnlyLocal(programaDaTrilha.revisadoEm).toLocaleDateString('pt-BR')}.`}
                      {certificacao && ' Os simulados do MindForge ainda não reproduzem os pesos da prova.'}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
