"use client";

import { useId, useRef, useState } from "react";
import { useExecutarCodigo } from "@/lib/hooks/useSandbox";
import { ExecutarCodigoInput, ResultadoExecucaoCodigo } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusTexto: Record<ResultadoExecucaoCodigo["status"], string> = {
  concluido: "Execução concluída",
  erro: "Erro no programa",
  limite_tempo: "Tempo limite atingido",
  limite_saida: "Limite de saída atingido",
  limite_memoria: "Limite de memória atingido",
};

export function ExecutorCodigo({
  exercicioId,
  perfilId,
  codigo,
  disabled = false,
}: {
  exercicioId: string;
  perfilId: string | null;
  codigo: string;
  disabled?: boolean;
}) {
  const id = useId();
  const [linguagem, setLinguagem] =
    useState<ExecutarCodigoInput["linguagem"]>("python");
  const [entrada, setEntrada] = useState("");
  const executar = useExecutarCodigo();
  const emAndamento = useRef(false);
  const variaveis = executar.variables;
  const atual =
    variaveis?.codigo === codigo &&
    variaveis?.entrada === entrada &&
    variaveis?.linguagem === linguagem &&
    variaveis?.perfilId === perfilId &&
    variaveis?.exercicioId === exercicioId;
  const resultado = atual ? executar.data : undefined;

  async function testar() {
    if (disabled || !perfilId || !codigo.trim() || emAndamento.current) return;
    emAndamento.current = true;
    try {
      await executar.mutateAsync({
        exercicioId,
        perfilId,
        codigo,
        linguagem,
        entrada,
      });
    } catch {
      // O erro aparece abaixo e o editor do aluno permanece intacto.
    } finally {
      emAndamento.current = false;
    }
  }

  return (
    <div className="min-w-0 space-y-3 rounded-lg border p-3">
      <p className="text-sm text-muted-foreground">
        Teste seu código com Python ou JavaScript. Executar não envia a resposta
        para correção.
      </p>
      <div className="space-y-2">
        <Label htmlFor={`${id}-linguagem`}>Linguagem para executar</Label>
        <Select
          value={linguagem}
          disabled={disabled || executar.isPending}
          onValueChange={(value) => {
            setLinguagem(value as ExecutarCodigoInput["linguagem"]);
            executar.reset();
          }}
        >
          <SelectTrigger id={`${id}-linguagem`} className="w-full sm:w-48">
            <SelectValue>
              {(value: string | null) =>
                value === "javascript" ? "JavaScript" : "Python"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="python">Python</SelectItem>
            <SelectItem value="javascript">JavaScript</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-entrada`}>Entrada do programa (opcional)</Label>
        <Textarea
          id={`${id}-entrada`}
          value={entrada}
          maxLength={4000}
          disabled={disabled || executar.isPending}
          placeholder="Dados lidos por input() ou stdin"
          className="font-mono text-sm"
          onChange={(e) => {
            setEntrada(e.target.value);
            executar.reset();
          }}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => void testar()}
        disabled={
          disabled ||
          executar.isPending ||
          !perfilId ||
          !codigo.trim() ||
          codigo.length > 16000
        }
      >
        {executar.isPending ? "Executando..." : "Executar código"}
      </Button>
      {!perfilId && (
        <p className="text-sm">Selecione um perfil para executar.</p>
      )}
      {codigo.length > 16000 && (
        <p role="alert">
          O código deve ter até 16 mil caracteres para executar.
        </p>
      )}
      {executar.isPending && (
        <p role="status" className="text-sm">
          Executando o programa…
        </p>
      )}
      {atual && executar.error && (
        <p role="alert" className="text-sm">
          {executar.error.message || "Não foi possível executar o código."}
        </p>
      )}
      {resultado && (
        <div role="status" className="min-w-0 space-y-2 text-sm">
          <p className="font-medium">{statusTexto[resultado.status]}</p>
          <p className="text-muted-foreground">
            Duração:{" "}
            {(resultado.duracaoMs / 1000).toLocaleString("pt-BR", {
              maximumFractionDigits: 2,
            })}{" "}
            s
          </p>
          <p className="font-medium">Saída</p>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-3">
            {resultado.stdout || "Sem saída."}
          </pre>
          {resultado.stderr && (
            <>
              <p className="font-medium">Erros do programa</p>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-3">
                {resultado.stderr}
              </pre>
            </>
          )}
          {resultado.status.startsWith("limite_") && (
            <p>
              O programa foi interrompido. Revise o código e execute novamente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
