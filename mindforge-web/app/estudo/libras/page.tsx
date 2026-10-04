import { redirect } from 'next/navigation';

// A grade agora participa do fluxo de objetivos do perfil selecionado.
export default function LibrasPage() {
  redirect('/objetivos');
}
