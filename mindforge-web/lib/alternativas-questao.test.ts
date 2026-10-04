import { describe, expect, it } from "vitest";
import { extrairAlternativas, extrairGabarito } from "./alternativas-questao";

describe("Alternativas presentes no enunciado", () => {
  it("preserva pergunta, continuação e alternativas com marcadores distintos", () => {
    expect(
      extrairAlternativas(
        "Leia o caso.\r\nQual opção?\r\n\r\n**A.** Primeiro caminho.\r\nCom continuação.\r\n\r\nB) Segundo caminho.",
      ),
    ).toEqual({
      pergunta: "Leia o caso.\nQual opção?",
      alternativas: [
        { letra: "A", texto: "Primeiro caminho.\nCom continuação." },
        { letra: "B", texto: "Segundo caminho." },
      ],
    });
  });
  it.each([
    "Pergunta sem opções",
    "Qual?\nA. Uma só",
    "Qual?\nA. Primeiro\nC. Sem B",
    "Qual?\nA. Primeiro\nA. Repetida",
  ])("não inventa opções para o formato incompleto: %s", (enunciado) => {
    expect(extrairAlternativas(enunciado)).toBeNull();
  });
  it("lê o gabarito apenas da correção disponível após a finalização", () => {
    expect(extrairGabarito("**Gabarito: B.** Comentário.")).toBe("B");
    expect(extrairGabarito(null)).toBeUndefined();
  });
});
