import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownViewer } from './markdown-viewer';

describe('MarkdownViewer', () => {
  it('renderiza tabela GFM como <table> (regressão: virava texto de pipes)', () => {
    const { container } = render(
      <MarkdownViewer>{'| Recurso | A | B |\n| --- | --- | --- |\n| Tipo | x | y |'}</MarkdownViewer>,
    );

    const tabela = container.querySelector('table');
    expect(tabela).toBeInTheDocument();
    expect(tabela!.querySelectorAll('th')).toHaveLength(3);
    expect(screen.getByText('Recurso')).toBeInTheDocument();
  });

  it('renderiza code fence como bloco com highlight e botão copiar', () => {
    const { container } = render(
      <MarkdownViewer>{'```bash\nnpm init -y\n```'}</MarkdownViewer>,
    );

    const code = container.querySelector('pre code');
    expect(code).toBeInTheDocument();
    expect(code!.className).toContain('hljs');
    expect(code!.className).toContain('language-bash');
    expect(code!.textContent).toContain('npm init -y');
    expect(screen.getByLabelText('Copiar código')).toBeInTheDocument();
    expect(screen.getByText('bash')).toBeInTheDocument();
  });

  it('botão copiar chama clipboard com o conteúdo do bloco', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { container } = render(
      <MarkdownViewer>{'```ts\nconst a = 1;\n```'}</MarkdownViewer>,
    );

    fireEvent.click(screen.getByLabelText('Copiar código'));

    expect(writeText).toHaveBeenCalledWith('const a = 1;');
    expect(await screen.findByText('Copiado!')).toBeInTheDocument();
    expect(container.querySelector('pre code')).toBeInTheDocument();
  });

  it('renderiza <details>/<summary> como bloco expansível', () => {
    const { container } = render(
      <MarkdownViewer>{'<details>\n<summary>Ver resposta</summary>\nSurpresa!\n</details>'}</MarkdownViewer>,
    );

    const details = container.querySelector('details');
    expect(details).toBeInTheDocument();
    expect(details!.querySelector('summary')!.textContent).toContain('Ver resposta');
    expect(screen.getByText('Surpresa!')).toBeInTheDocument();
  });

  it('sanitiza script e event handlers do HTML cru', () => {
    const { container } = render(
      <MarkdownViewer>{'<script>alert("xss")</script>\n<img src="y" onerror="alert(1)">'}</MarkdownViewer>,
    );

    expect(container.querySelector('script')).not.toBeInTheDocument();
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img!.getAttribute('onerror')).toBeNull();
    expect(screen.queryByText('alert("xss")')).not.toBeInTheDocument();
  });

  it('converte quebra de linha simples em <br>', () => {
    const { container } = render(<MarkdownViewer>{'linha um\nlinha dois'}</MarkdownViewer>);

    expect(container.querySelector('br')).toBeInTheDocument();
  });

  it('renderiza código inline sem virar bloco', () => {
    const { container } = render(
      <MarkdownViewer>{'Use o comando `npm run dev` para iniciar.'}</MarkdownViewer>,
    );

    const inline = container.querySelector('p code');
    expect(inline).toBeInTheDocument();
    expect(inline!.textContent).toBe('npm run dev');
    expect(container.querySelector('pre')).not.toBeInTheDocument();
  });

  it('links externos abrem em nova aba', () => {
    render(<MarkdownViewer>{'[MDN](https://developer.mozilla.org/docs)'}</MarkdownViewer>);

    const link = screen.getByRole('link', { name: 'MDN' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});
