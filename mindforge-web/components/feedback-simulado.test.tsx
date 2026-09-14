import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeedbackSimulado } from "./feedback-simulado";
import type { ResultadoAvaliacao } from "@/types/api";

const base: ResultadoAvaliacao = {
  pontuacaoTotal: "0",
  pontosFortes: [],
  pontosFracos: [],
  recomendacoes: [],
};
const detalhe = {
  exercicioId: "e",
  tentativaId: "t",
  enunciado: "Quanto é 2 + 2?",
  respostaUsuario: '<script>alert("resposta")</script>',
  correta: false,
  pontuacao: "0",
  feedbackIa: "Resposta incorreta. **4**",
};

describe("Correção do simulado", () => {
  it("mostra a resposta como texto e o gabarito no feedback", () => {
    const { container } = render(
      <FeedbackSimulado
        resultado={{ ...base, feedbackExercicios: [detalhe] }}
      />,
    );
    expect(screen.getByText(detalhe.respostaUsuario)).toBeVisible();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("Incorreta")).toBeVisible();
    expect(screen.getByText("4")).toBeVisible();
    expect(
      screen.queryByText(/não é possível identificar/),
    ).not.toBeInTheDocument();
  });
  it("distingue questão omitida de tentativa sem feedback ou classificação", () => {
    render(
      <FeedbackSimulado
        resultado={{
          ...base,
          feedbackExercicios: [
            {
              ...detalhe,
              tentativaId: null,
              respostaUsuario: null,
              correta: null,
              feedbackIa: null,
            },
            {
              ...detalhe,
              exercicioId: "e2",
              tentativaId: "t2",
              correta: null,
              pontuacao: null,
              feedbackIa: null,
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("Não respondida")).toBeVisible();
    expect(screen.getByText("Sem classificação")).toBeVisible();
    expect(screen.getByText("Pontuação indisponível")).toBeVisible();
    expect(
      screen.getByText("Feedback não registrado para esta resposta."),
    ).toBeVisible();
  });
  it("apresenta todas as tentativas legadas como histórico, sem atribuí-las à nota", () => {
    render(
      <FeedbackSimulado
        resultado={{
          ...base,
          feedbackExercicios: null,
          historicoTentativas: [
            detalhe,
            { ...detalhe, tentativaId: "t2", feedbackIa: "Segunda correção" },
          ],
        }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Histórico de correções" }),
    ).toBeVisible();
    expect(
      screen.getByText(/não é possível identificar quais tentativas/),
    ).toBeVisible();
    expect(screen.getByText("Segunda correção")).toBeVisible();
  });
  it("informa a ausência de histórico nos resultados antigos sem tentativas", () => {
    render(
      <FeedbackSimulado
        resultado={{
          ...base,
          feedbackExercicios: null,
          historicoTentativas: [],
        }}
      />,
    );
    expect(
      screen.getByText("Nenhuma correção individual disponível."),
    ).toBeVisible();
  });
});
