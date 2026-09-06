'use client';

import { useId } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useModulosDoPerfil } from '@/lib/hooks/useModulos';

interface SeletorTrilhaModuloProps {
  perfilId: string | null;
  trilhaId: string;
  moduloId: string;
  onTrilhaChange: (trilhaId: string) => void;
  onModuloChange: (moduloId: string) => void;
  id?: string;
  disabled?: boolean;
}

/**
 * Seletor em cascata: primeiro a trilha (agrupadora/título pai), depois o
 * módulo (filho). Evita a lista plana de módulos de todas as trilhas, que
 * polui a visão quando o perfil tem vários objetivos.
 */
export function SeletorTrilhaModulo({
  perfilId,
  trilhaId,
  moduloId,
  onTrilhaChange,
  onModuloChange,
  id,
  disabled,
}: SeletorTrilhaModuloProps) {
  const { grupos, isLoading } = useModulosDoPerfil(perfilId);
  const semTrilhas = !isLoading && grupos.length === 0;
  const trilhaAtual = grupos.find((grupo) => grupo.trilhaId === trilhaId);
  const modulosDaTrilha = trilhaAtual?.modulos ?? [];
  const moduloAtual = modulosDaTrilha.find((modulo) => modulo.id === moduloId);

  const placeholderTrilha = isLoading
    ? 'Carregando trilhas...'
    : semTrilhas
      ? 'Nenhuma trilha ativa (gere uma trilha primeiro)'
      : 'Selecione a trilha';
  const placeholderModulo = !trilhaAtual ? 'Selecione a trilha primeiro' : 'Selecione o módulo';

  // IDs estáveis para o label acessível de cada trigger (review Codex P2:
  // leitores de tela precisam de nome acessível além do placeholder).
  const idBase = useId();
  const idTrilha = id ? `${id}-trilha` : `${idBase}-trilha`;
  const idModulo = id ? `${id}-modulo` : `${idBase}-modulo`;

  const selecionarTrilha = (novoId: string) => {
    onTrilhaChange(novoId ?? '');
    // Módulo da trilha anterior não pertence ao grupo novo.
    onModuloChange('');
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={idTrilha}>Trilha</Label>
        <Select
          value={trilhaId}
          onValueChange={(novoId) => selecionarTrilha(novoId ?? '')}
          disabled={disabled || isLoading || semTrilhas}
        >
          <SelectTrigger id={idTrilha} className="w-full">
            {/* Rótulo explícito: o base-ui não resolve o texto do item com o
                popup fechado e exibiria o ID da trilha no trigger. */}
            <SelectValue>{trilhaAtual?.titulo ?? placeholderTrilha}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {grupos.map((grupo) => (
              <SelectItem key={grupo.trilhaId} value={grupo.trilhaId}>
                {grupo.titulo}
                <span className="text-muted-foreground">· {grupo.modulos.length} módulos</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={idModulo}>Módulo</Label>
        <Select
          value={moduloId}
          onValueChange={(novoId) => onModuloChange(novoId ?? '')}
          disabled={disabled || isLoading || !trilhaAtual || modulosDaTrilha.length === 0}
        >
          <SelectTrigger id={idModulo} className="w-full">
            <SelectValue>
              {moduloAtual ? `${moduloAtual.ordem}. ${moduloAtual.titulo}` : placeholderModulo}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {modulosDaTrilha.map((modulo) => (
              <SelectItem key={modulo.id} value={modulo.id}>
                {modulo.ordem}. {modulo.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
