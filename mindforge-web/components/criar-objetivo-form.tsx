'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useCriarObjetivo } from '@/lib/hooks/useObjetivos';
import { Nivel } from '@/types/api';

interface CriarObjetivoFormProps {
  perfilId: string;
  onSuccess?: () => void;
}

const niveis: { value: Nivel; label: string }[] = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
];

export function CriarObjetivoForm({ perfilId, onSuccess }: CriarObjetivoFormProps) {
  const criar = useCriarObjetivo();
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [nivel, setNivel] = useState<Nivel | ''>('');
  const [prazo, setPrazo] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await criar.mutateAsync({
        perfilId,
        titulo,
        descricao: descricao || undefined,
        nivelDesejado: nivel || undefined,
        prazoEstimado: prazo || undefined,
      });
      toast.success('Objetivo criado com sucesso');
      setTitulo('');
      setDescricao('');
      setNivel('');
      setPrazo('');
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar objetivo');
    }
  };

  return (
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
          <Select
            value={nivel}
            onValueChange={(value) => setNivel((value as Nivel) || '')}
          >
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
  );
}
