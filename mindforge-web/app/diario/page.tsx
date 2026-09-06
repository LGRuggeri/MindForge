'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useDiario, useRegistrarDiario } from '@/lib/hooks/useDiario';
import { useModulosDoPerfil } from '@/lib/hooks/useModulos';
import type { RegistroDiarioComRecomendacoes } from '@/types/api';
import { SeletorModulo } from '@/components/seletor-modulo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { NotebookPen, Plus, Sparkles, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { hojeLocal, parseDateOnlyLocal } from '@/lib/date-helpers';
import { MarkdownViewer } from '@/components/markdown-viewer';

export default function DiarioPage() {
  const { perfilSelecionado } = useAppStore();
  const { data: registros, isLoading } = useDiario(perfilSelecionado?.id || null);
  const { data: modulosDisponiveis } = useModulosDoPerfil(perfilSelecionado?.id || null);
  const registrar = useRegistrarDiario();

  const tituloModulo = (moduloId: string) =>
    modulosDisponiveis.find((item) => item.modulo.id === moduloId)?.modulo.titulo ??
    `${moduloId.slice(0, 8)}…`;

  const [data, setData] = useState(hojeLocal());
  const [tempo, setTempo] = useState('');
  const [conquistas, setConquistas] = useState('');
  const [dificuldades, setDificuldades] = useState('');
  const [moduloSelecionado, setModuloSelecionado] = useState('');
  const [moduloIds, setModuloIds] = useState<string[]>([]);
  const [ultimaRecomendacao, setUltimaRecomendacao] =
    useState<RegistroDiarioComRecomendacoes | null>(null);

  // Ao trocar de perfil, descarta TODO o rascunho durante o render (padrão
  // oficial "adjust state during render"): texto, módulos e recomendação do
  // perfil anterior não podem ser gravados/exibidos no perfil novo
  // (review Codex P1).
  const [rascunhoDoPerfil, setRascunhoDoPerfil] = useState(perfilSelecionado?.id);
  if (rascunhoDoPerfil !== perfilSelecionado?.id) {
    setRascunhoDoPerfil(perfilSelecionado?.id);
    setTempo('');
    setConquistas('');
    setDificuldades('');
    setModuloIds([]);
    setModuloSelecionado('');
    setUltimaRecomendacao(null);
  }

  const adicionarModulo = (moduloId: string) => {
    if (!moduloId || moduloIds.includes(moduloId)) return;
    setModuloIds((anterior) => [...anterior, moduloId]);
    setModuloSelecionado('');
  };

  const removerModulo = (moduloId: string) => {
    setModuloIds((anterior) => anterior.filter((id) => id !== moduloId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfilSelecionado) {
      toast.error('Selecione um perfil');
      return;
    }
    const tempoInvestidoMin = tempo ? Number(tempo) : undefined;
    if (tempoInvestidoMin !== undefined && (Number.isNaN(tempoInvestidoMin) || tempoInvestidoMin < 0)) {
      toast.error('Tempo investido inválido');
      return;
    }
    try {
      const registro = await registrar.mutateAsync({
        perfilId: perfilSelecionado.id,
        data,
        tempoInvestidoMin,
        conquistas: conquistas || undefined,
        dificuldades: dificuldades || undefined,
        moduloIds: moduloIds.length > 0 ? moduloIds : undefined,
      });
      setUltimaRecomendacao(registro);
      setTempo('');
      setConquistas('');
      setDificuldades('');
      setModuloIds([]);
      toast.success('Registro salvo no diário');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar diário');
    }
  };

  if (!perfilSelecionado) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <NotebookPen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Selecione um perfil</h1>
        <p className="text-muted-foreground mb-6">
          Você precisa selecionar um perfil para acompanhar seu diário de aprendizagem.
        </p>
        <Button asChild>
          <Link href="/perfis">Ir para perfis</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Diário de aprendizagem</h1>
        <p className="text-muted-foreground">
          Registre o que estudou, suas conquistas e dificuldades. O Tutor IA gera recomendações
          personalizadas para a próxima sessão.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo registro
          </CardTitle>
          <CardDescription>
            Um registro por dia. Vincule os módulos estudados para um acompanhamento mais preciso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tempo">Tempo investido (minutos)</Label>
                <Input
                  id="tempo"
                  type="number"
                  min={0}
                  value={tempo}
                  onChange={(e) => setTempo(e.target.value)}
                  placeholder="Ex: 45"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="conquistas">O que você estudou e conquistou hoje</Label>
              <Textarea
                id="conquistas"
                value={conquistas}
                onChange={(e) => setConquistas(e.target.value)}
                placeholder="Ex: Terminei o módulo de injeção de dependência e resolvi 5 exercícios..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dificuldades">Dificuldades (opcional)</Label>
              <Textarea
                id="dificuldades"
                value={dificuldades}
                onChange={(e) => setDificuldades(e.target.value)}
                placeholder="Ex: Ainda confundo providers e modules no NestJS..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modulo">Módulos estudados</Label>
              <div className="flex gap-2">
                <SeletorModulo
                  id="modulo"
                  perfilId={perfilSelecionado.id}
                  value={moduloSelecionado}
                  onValueChange={adicionarModulo}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => adicionarModulo(moduloSelecionado)}
                  disabled={!moduloSelecionado || moduloIds.includes(moduloSelecionado)}
                >
                  Adicionar
                </Button>
              </div>
              {moduloIds.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {moduloIds.map((moduloId) => (
                    <Badge key={moduloId} variant="secondary" className="gap-1">
                      {tituloModulo(moduloId)}
                      <button
                        type="button"
                        aria-label="Remover módulo"
                        onClick={() => removerModulo(moduloId)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" disabled={registrar.isPending}>
              {registrar.isPending ? 'Registrando...' : 'Registrar no diário'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {ultimaRecomendacao && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Recomendações do Tutor IA
            </CardTitle>
            <CardDescription>
              Próximo foco: {ultimaRecomendacao.proximoFoco}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-neutral dark:prose-invert max-w-none text-sm">
              <MarkdownViewer>{ultimaRecomendacao.recomendacoesIa}</MarkdownViewer>
            </div>
            {(ultimaRecomendacao.ajustesSugeridos ?? []).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Ajustes sugeridos:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {(ultimaRecomendacao.ajustesSugeridos ?? []).map((ajuste) => (
                    <li key={ajuste}>{ajuste}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Registros anteriores</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : registros && registros.length > 0 ? (
          registros.map((registro) => (
            <Card key={registro.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold capitalize">
                    {format(parseDateOnlyLocal(registro.data), "EEEE, dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                  <Badge variant="secondary">{registro.tempoInvestidoMin} min</Badge>
                </div>
                {registro.modulos && registro.modulos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {registro.modulos.map((vinculo) => (
                      <Badge key={vinculo.moduloId} variant="outline">
                        {vinculo.modulo.titulo}
                      </Badge>
                    ))}
                  </div>
                )}
                {registro.conquistas && (
                  <div>
                    <p className="text-sm font-medium">Conquistas</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {registro.conquistas}
                    </p>
                  </div>
                )}
                {registro.dificuldades && (
                  <div>
                    <p className="text-sm font-medium">Dificuldades</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {registro.dificuldades}
                    </p>
                  </div>
                )}
                {registro.recomendacoesIa && (
                  <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
                    <p className="font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Recomendações da IA
                    </p>
                    <div className="prose prose-neutral dark:prose-invert max-w-none text-sm">
                      <MarkdownViewer>{registro.recomendacoesIa}</MarkdownViewer>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum registro no diário ainda.</p>
        )}
      </div>
    </div>
  );
}
