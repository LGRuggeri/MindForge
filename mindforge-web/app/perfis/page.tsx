'use client';

import { useState } from 'react';
import { usePerfis, useCriarPerfil } from '@/lib/hooks/usePerfis';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus, User } from 'lucide-react';

export default function PerfisPage() {
  const { data: perfis, isLoading } = usePerfis();
  const criar = useCriarPerfil();
  const { perfilSelecionado, selecionarPerfil } = useAppStore();

  const [nome, setNome] = useState('');
  const [objetivos, setObjetivos] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const perfil = await criar.mutateAsync({
        nome,
        objetivosGerais: objetivos || undefined,
      });
      selecionarPerfil(perfil);
      toast.success('Perfil criado com sucesso');
      setNome('');
      setObjetivos('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar perfil');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Perfis</h1>
        <p className="text-muted-foreground">Gerencie seus perfis de aprendizado.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Novo perfil
          </CardTitle>
          <CardDescription>Crie um perfil para organizar seus estudos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome (ex: Luiz Gustavo)"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objetivos">Objetivos gerais</Label>
              <Textarea
                id="objetivos"
                value={objetivos}
                onChange={(e) => setObjetivos(e.target.value)}
                placeholder="Descreva seus objetivos de aprendizado. O Tutor IA usa esse contexto junto com as trilhas e pesquisas para entender o que você busca aprender."
              />
            </div>
            <Button type="submit" disabled={criar.isPending}>
              {criar.isPending ? 'Criando...' : 'Criar perfil'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfis existentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : perfis && perfis.length > 0 ? (
            perfis.map((perfil) => (
              <button
                key={perfil.id}
                onClick={() => selecionarPerfil(perfil)}
                className={`w-full text-left rounded-lg border p-4 transition-colors hover:bg-muted ${
                  perfilSelecionado?.id === perfil.id ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{perfil.nome}</p>
                    {perfil.objetivosGerais && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {perfil.objetivosGerais}
                      </p>
                    )}
                  </div>
                  {perfilSelecionado?.id === perfil.id && (
                    <span className="text-xs font-medium text-primary">Selecionado</span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum perfil encontrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
