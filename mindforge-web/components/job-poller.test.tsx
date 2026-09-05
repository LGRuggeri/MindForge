import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JobPoller } from './job-poller';
import { useJob } from '@/lib/hooks/useJobs';

vi.mock('@/lib/hooks/useJobs', () => ({
  useJob: vi.fn(),
}));

const useJobMock = vi.mocked(useJob);

function mockJob(status?: string) {
  useJobMock.mockReturnValue({
    data: status === undefined ? undefined : ({ status } as never),
  } as never);
}

describe('JobPoller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra estado de processamento enquanto o job não termina', () => {
    mockJob('active');

    render(<JobPoller nome="research.pesquisar" id="job-1" />);

    expect(screen.getByText('Job: research.pesquisar')).toBeInTheDocument();
    expect(screen.getByText('Status: active')).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('mostra "processando" quando ainda não há status', () => {
    mockJob(undefined);

    render(<JobPoller nome="research.pesquisar" id="job-1" />);

    expect(screen.getByText('Status: processando')).toBeInTheDocument();
  });

  it('mostra sucesso e chama onComplete uma única vez', () => {
    mockJob('completed');
    const onComplete = vi.fn();

    const { rerender } = render(
      <JobPoller nome="research.pesquisar" id="job-1" onComplete={onComplete} />,
    );
    rerender(<JobPoller nome="research.pesquisar" id="job-1" onComplete={onComplete} />);

    expect(screen.getByText('Status: completed')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('mostra erro quando o job falha', () => {
    mockJob('failed');

    render(<JobPoller nome="synthesizer.gerar-conteudo" id="job-2" />);

    expect(screen.getByText('Status: failed')).toBeInTheDocument();
  });

  it('mostra erro também quando o job é cancelado', () => {
    mockJob('cancelled');

    render(<JobPoller nome="exercicios.gerar" id="job-3" />);

    expect(screen.getByText('Status: cancelled')).toBeInTheDocument();
  });

  it('não chama onComplete enquanto o job está em andamento', () => {
    mockJob('active');
    const onComplete = vi.fn();

    render(<JobPoller nome="research.pesquisar" id="job-1" onComplete={onComplete} />);

    expect(onComplete).not.toHaveBeenCalled();
  });
});
