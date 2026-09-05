'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModulosDoPerfil } from '@/lib/hooks/useModulos';

interface SeletorModuloProps {
  perfilId: string | null;
  value: string;
  onValueChange: (moduloId: string) => void;
  id?: string;
  disabled?: boolean;
}

export function SeletorModulo({ perfilId, value, onValueChange, id, disabled }: SeletorModuloProps) {
  const { data: modulos, isLoading } = useModulosDoPerfil(perfilId);
  const semModulos = !isLoading && modulos.length === 0;

  return (
    <Select
      value={value}
      onValueChange={(novoValor) => onValueChange(novoValor ?? '')}
      disabled={disabled || isLoading || semModulos}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue
          placeholder={
            isLoading
              ? 'Carregando módulos...'
              : semModulos
                ? 'Nenhum módulo disponível (gere uma trilha primeiro)'
                : 'Selecione o módulo'
          }
        />
      </SelectTrigger>
      <SelectContent>
        {modulos.map(({ modulo, objetivoTitulo }) => (
          <SelectItem key={modulo.id} value={modulo.id}>
            {modulo.titulo} <span className="text-muted-foreground">· {objetivoTitulo}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
