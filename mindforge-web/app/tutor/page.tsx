'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useHistoricoTutor, useTirarDuvida } from '@/lib/hooks/useTutor';
import { useModulosDoPerfil } from '@/lib/hooks/useModulos';
import { SeletorModulo } from '@/components/seletor-modulo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { MessageCircle, Send, User, Bot } from 'lucide-react';
import Link from 'next/link';
import { MarkdownViewer } from '@/components/markdown-viewer';

export default function TutorPage() {
  const { perfilSelecionado } = useAppStore();
  const [pergunta, setPergunta] = useState('');
  const [moduloId, setModuloId] = useState('');
  const { data: historico, isLoading } = useHistoricoTutor(perfilSelecionado?.id || null);
  const { data: modulosDisponiveis } = useModulosDoPerfil(perfilSelecionado?.id || null);
  const tirarDuvida = useTirarDuvida();

  const tituloModulo = (id: string) =>
    modulosDisponiveis.find((item) => item.modulo.id === id)?.modulo.titulo ?? id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfilSelecionado) {
      toast.error('Selecione um perfil');
      return;
    }
    if (!moduloId) {
      toast.error('Selecione o módulo');
      return;
    }
    try {
      await tirarDuvida.mutateAsync({
        perfilId: perfilSelecionado.id,
        moduloId,
        pergunta,
      });
      setPergunta('');
      toast.success('Resposta gerada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar dúvida');
    }
  };

  if (!perfilSelecionado) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Selecione um perfil</h1>
        <Button asChild>
          <Link href="/perfis">Ir para perfis</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tutor IA</h1>
        <p className="text-muted-foreground">Tire dúvidas sobre o conteúdo dos módulos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Nova pergunta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="modulo" className="text-sm font-medium">
                Módulo
              </label>
              <SeletorModulo
                id="modulo"
                perfilId={perfilSelecionado.id}
                value={moduloId}
                onValueChange={setModuloId}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="pergunta" className="text-sm font-medium">
                Pergunta
              </label>
              <Input
                id="pergunta"
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                placeholder="Ex: O que é injeção de dependência?"
                required
              />
            </div>
            <Button type="submit" disabled={tirarDuvida.isPending}>
              {tirarDuvida.isPending ? 'Enviando...' : 'Enviar pergunta'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Histórico</h2>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : historico && historico.length > 0 ? (
          historico.map((duvida) => (
            <Card key={duvida.id}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{duvida.pergunta}</p>
                    <p className="text-xs text-muted-foreground">Módulo: {tituloModulo(duvida.moduloId)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg bg-muted p-4">
                  <Bot className="h-5 w-5 mt-0.5 text-primary" />
                  <div className="prose prose-neutral dark:prose-invert max-w-none text-sm">
                    <MarkdownViewer>{duvida.resposta}</MarkdownViewer>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma dúvida registrada ainda.</p>
        )}
      </div>
    </div>
  );
}
