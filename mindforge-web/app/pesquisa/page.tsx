'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { usePesquisarFontes, useFontesModulo } from '@/lib/hooks/useResearch';
import type { ResultadoPesquisa } from '@/types/api';
import { SeletorTrilhaModulo } from '@/components/seletor-trilha-modulo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Search, Globe, BookMarked, ExternalLink } from 'lucide-react';

const TIPOS_FONTE: Record<string, string> = {
  documentacao_oficial: 'Documentação oficial',
  livro: 'Livro',
  artigo: 'Artigo',
  video: 'Vídeo',
  outro: 'Outro',
};

function rotuloTipo(tipo: string): string {
  return TIPOS_FONTE[tipo] ?? tipo;
}

export default function PesquisaPage() {
  const { perfilSelecionado } = useAppStore();
  const [trilhaId, setTrilhaId] = useState('');
  const [moduloId, setModuloId] = useState('');
  const [topico, setTopico] = useState('');
  const [limite, setLimite] = useState('5');
  const [webSearch, setWebSearch] = useState(true);
  const [resultado, setResultado] = useState<ResultadoPesquisa | null>(null);

  // Ao trocar de perfil, descarta trilha, módulo e resultado durante o render — o
  // módulo do perfil anterior não pode ser pesquisado "como se fosse" do
  // perfil novo (review Codex P2).
  const [estadoDoPerfil, setEstadoDoPerfil] = useState(perfilSelecionado?.id);
  if (estadoDoPerfil !== perfilSelecionado?.id) {
    setEstadoDoPerfil(perfilSelecionado?.id);
    setTrilhaId('');
    setModuloId('');
    setResultado(null);
  }

  const pesquisar = usePesquisarFontes();
  const { data: fontesCuradas, isLoading: carregandoFontes } = useFontesModulo(moduloId || null);

  // Reflete perfil/módulo mais recentes para o guarda de resposta defasada:
  // pesquisa web + curadoria LLM podem demorar, e o await abaixo resolve
  // depois de o usuário trocar de perfil ou de módulo (review Codex P2).
  const contextoAtualRef = useRef({ perfilId: perfilSelecionado?.id, moduloId });
  useEffect(() => {
    contextoAtualRef.current = { perfilId: perfilSelecionado?.id, moduloId };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduloId) {
      toast.error('Selecione o módulo');
      return;
    }
    const contextoDaTentativa = { perfilId: perfilSelecionado?.id, moduloId };
    // Limpa o resultado anterior para não exibir dados defasados se esta
    // tentativa falhar (review Codex P2).
    setResultado(null);
    try {
      const resposta = await pesquisar.mutateAsync({
        moduloId,
        topico: topico || undefined,
        // Campo vazio usa o padrão do backend — Number('') seria 0 e o DTO rejeita.
        limite: limite.trim() === '' ? undefined : Number(limite),
        webSearch,
      });
      const contextoMudou =
        contextoAtualRef.current.perfilId !== contextoDaTentativa.perfilId ||
        contextoAtualRef.current.moduloId !== contextoDaTentativa.moduloId;
      if (contextoMudou) {
        toast.info('Perfil ou módulo alterado durante a pesquisa — resultado descartado.');
        return;
      }
      if ('jobId' in resposta) {
        toast.info('Pesquisa enfileirada. Acompanhe pelo endpoint de jobs.');
        return;
      }
      setResultado(resposta);
      toast.success(`${resposta.fontes.length} fontes curadas`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao pesquisar fontes');
    }
  };

  if (!perfilSelecionado) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Selecione um perfil</h1>
        <p className="text-muted-foreground mb-6">
          Você precisa selecionar um perfil para pesquisar fontes de estudo.
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
        <h1 className="text-3xl font-bold tracking-tight">Pesquisa de fontes</h1>
        <p className="text-muted-foreground">
          Use o Research Engine para curar fontes confiáveis para um módulo da sua trilha.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Nova pesquisa
          </CardTitle>
          <CardDescription>
            O módulo define o contexto da trilha e do objetivo de aprendizagem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Módulo da trilha</p>
              <SeletorTrilhaModulo
                id="modulo"
                perfilId={perfilSelecionado.id}
                trilhaId={trilhaId}
                moduloId={moduloId}
                onTrilhaChange={setTrilhaId}
                onModuloChange={(id) => {
                  setModuloId(id);
                  setResultado(null);
                }}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="topico">Tópico (opcional)</Label>
                <Input
                  id="topico"
                  value={topico}
                  onChange={(e) => setTopico(e.target.value)}
                  placeholder="Padroniza no título do módulo se vazio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limite">Quantidade de fontes</Label>
                <Input
                  id="limite"
                  type="number"
                  min={1}
                  max={12}
                  value={limite}
                  onChange={(e) => setLimite(e.target.value)}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={webSearch}
                onChange={(e) => setWebSearch(e.target.checked)}
              />
              <Globe className="h-4 w-4 text-muted-foreground" />
              Buscar na web antes de curar (recomendado)
            </label>
            <Button type="submit" disabled={pesquisar.isPending || !moduloId}>
              {pesquisar.isPending ? 'Pesquisando...' : 'Pesquisar fontes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {resultado && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Resultado da pesquisa</h2>
            <Badge variant="secondary">{resultado.fontes.length} fontes</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Estratégia:</strong> {resultado.estrategia} · Tópico: {resultado.topico} ·{' '}
            {resultado.resultadosWeb} resultados web usados
          </p>
          {resultado.fontes.map((fonte) => (
            <Card key={fonte.id}>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{rotuloTipo(fonte.tipo)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Confiabilidade {Math.round(Number(fonte.confiabilidadeScore) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BookMarked className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {fonte.url ? (
                    <a
                      href={fonte.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline break-all"
                    >
                      {fonte.titulo}
                    </a>
                  ) : (
                    <span className="font-medium">{fonte.titulo}</span>
                  )}
                  {fonte.url && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                </div>
                {fonte.autor && <p className="text-sm text-muted-foreground">Autor: {fonte.autor}</p>}
                <p className="text-sm">{fonte.resumo}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {moduloId && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Fontes já curadas para este módulo</h2>
          {carregandoFontes ? (
            <Skeleton className="h-24 w-full" />
          ) : fontesCuradas && fontesCuradas.length > 0 ? (
            fontesCuradas.map((fonte) => (
              <Card key={fonte.id}>
                <CardContent className="p-5 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{rotuloTipo(fonte.tipo)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Confiabilidade {Math.round(Number(fonte.confiabilidadeScore) * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookMarked className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {fonte.url ? (
                      <a
                        href={fonte.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline break-all"
                      >
                        {fonte.titulo}
                      </a>
                    ) : (
                      <span className="font-medium">{fonte.titulo}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{fonte.resumo}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma fonte curada ainda para este módulo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
