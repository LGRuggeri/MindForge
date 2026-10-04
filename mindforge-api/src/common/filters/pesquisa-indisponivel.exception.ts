import { ServiceUnavailableException } from '@nestjs/common';

export const MENSAGEM_PESQUISA_INDISPONIVEL =
  'Não foi possível concluir a pesquisa web para atualizar as fontes. Nenhuma aula foi gerada. Tente novamente ou desmarque a pesquisa para usar fontes salvas.';

/** Mensagem pública fixa; nunca incorpora erros, URLs ou credenciais do provedor. */
export class PesquisaIndisponivelException extends ServiceUnavailableException {
  constructor() {
    super(MENSAGEM_PESQUISA_INDISPONIVEL);
  }
}
