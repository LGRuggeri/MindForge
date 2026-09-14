"use client";

import { useState } from "react";
import Link from "next/link";
import { useRevisoes } from "@/lib/hooks/useRevisao";
import { useAppStore } from "@/lib/store";
import { SessaoRevisao } from "@/components/sessao-revisao";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RevisaoItem } from "@/types/api";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RevisaoPage() {
  const perfil = useAppStore((state) => state.perfilSelecionado);
  return perfil ? (
    <AgendaRevisao key={perfil.id} perfilId={perfil.id} />
  ) : (
    <p>
      Selecione um perfil para consultar suas revisões.{" "}
      <Link href="/perfis" className="underline">
        Ir para perfis
      </Link>
    </p>
  );
}

function AgendaRevisao({ perfilId }: { perfilId: string }) {
  const {
    data: revisoes = [],
    isLoading,
    error,
    refetch,
  } = useRevisoes(perfilId);
  const [ativa, setAtiva] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");
  const hoje = format(new Date(), "yyyy-MM-dd");
  const pendentes = revisoes.filter((r) => r.proximaRevisao <= hoje);
  const futuras = revisoes.filter((r) => r.proximaRevisao > hoje);

  function listar(itens: RevisaoItem[], disponivel: boolean) {
    return itens.map((revisao) => (
      <div
        key={revisao.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
      >
        <div>
          <p className="font-medium capitalize">
            {revisao.itemTipo === "exercicio"
              ? "Exercício"
              : revisao.itemTipo === "conteudo"
                ? "Conteúdo"
                : "Competência"}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(
              parseISO(revisao.proximaRevisao),
              "dd 'de' MMMM 'de' yyyy",
              { locale: ptBR },
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={revisao.proximaRevisao < hoje ? "destructive" : "outline"}
          >
            {revisao.proximaRevisao < hoje
              ? "Atrasada"
              : revisao.proximaRevisao === hoje
                ? "Hoje"
                : "Agendada"}
          </Badge>
          {disponivel && (
            <Button
              variant="outline"
              disabled={!!ativa}
              onClick={() => {
                setMensagem("");
                setAtiva(revisao.id);
              }}
            >
              Revisar
            </Button>
          )}
        </div>
      </div>
    ));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revisão espaçada</h1>
        <p className="text-muted-foreground">
          Relembre o que estudou e acompanhe sua próxima revisão.
        </p>
      </div>
      {mensagem && (
        <p role="status" className="rounded-lg border p-4">
          {mensagem}
        </p>
      )}
      {error ? (
        <div role="alert">
          <p>Não foi possível carregar a agenda.</p>
          <Button onClick={() => void refetch()}>Tentar novamente</Button>
        </div>
      ) : null}
      {ativa && (
        <SessaoRevisao
          key={ativa}
          id={ativa}
          perfilId={perfilId}
          aoFechar={() => {
            setAtiva(null);
            void refetch();
          }}
          aoConcluir={(data) => {
            setAtiva(null);
            setMensagem(
              `Revisão registrada. Próxima revisão: ${format(parseISO(data), "dd/MM/yyyy")}.`,
            );
          }}
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Revisões de hoje e atrasadas</CardTitle>
          <CardDescription>
            {pendentes.length} item(ns) para revisar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            !error &&
            (pendentes.length ? (
              listar(pendentes, true)
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma revisão pendente.
              </p>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Próximas revisões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            !error &&
            (futuras.length ? (
              listar(futuras, false)
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma revisão futura agendada.
              </p>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
