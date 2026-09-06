'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useObjetivos, useCriarObjetivo } from '@/lib/hooks/useObjetivos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Target, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnlyLocal } from '@/lib/date-helpers';

const niveis = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
];

export default function ObjetivosPage() {
  const { perfilSelecionado } = useAppStore();
  const { data: objetivos, isLoading } = useObjetivos(perfilSelecionado?.id || null);
  const criar = useCriarObjetivo();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [nivel, setNivel] = useState('');
  const [prazo, setPrazo] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfilSelecionado) {
      toast.error('Selecione um perfil primeiro');
      return;
    }
    try {
      await criar.mutateAsync({
        perfilId: perfilSelecionado.id,
        titulo,
        descricao: descricao || undefined,
        nivelDesejado: (nivel as never) || undefined,
        prazoEstimado: prazo || undefined,
      });
      toast.success('Objetivo criado com sucesso');
      setTitulo('');
      setDescricao('');
      setNivel('');
      setPrazo('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar objetivo');
    }
  };

  if (!perfilSelecionado) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Selecione um perfil</h1>
        <p className="text-muted-foreground mb-6">
          Você precisa selecionar um perfil para criar e visualizar objetivos.
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
        <h1 className="text-3xl font-bold tracking-tight">Objetivos</h1>
        <p className="text-muted-foreground">Defina o que você quer aprender.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo objetivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Aprender NestJS"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o objetivo com mais detalhes..."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nivel">Nível desejado</Label>
                <Select value={nivel} onValueChange={(value) => setNivel(value || '')}>
                  <SelectTrigger id="nivel">
                    <SelectValue>
                      {(valor: string | null) =>
                        niveis.find((n) => n.value === valor)?.label ?? 'Selecione'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {niveis.map((n) => (
                      <SelectItem key={n.value} value={n.value}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prazo">Prazo estimado</Label>
                <Input
                  id="prazo"
                  type="date"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={criar.isPending}>
              {criar.isPending ? 'Criando...' : 'Criar objetivo'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Seus objetivos</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : objetivos && objetivos.length > 0 ? (
          objetivos.map((objetivo) => (
            <Card key={objetivo.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{objetivo.titulo}</h3>
                      {objetivo.nivelDesejado && (
                        <Badge variant="outline" className="capitalize">
                          {objetivo.nivelDesejado}
                        </Badge>
                      )}
                    </div>
                    {objetivo.descricao && (
                      <CardDescription className="mb-2">{objetivo.descricao}</CardDescription>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Criado em{' '}
                      {format(new Date(objetivo.criadoEm), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                      {objetivo.prazoEstimado &&
                        ` · Prazo: ${format(parseDateOnlyLocal(objetivo.prazoEstimado), 'dd/MM/yyyy')}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/objetivos/${objetivo.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum objetivo encontrado.</p>
        )}
      </div>
    </div>
  );
}
