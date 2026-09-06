'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { usePerfis } from '@/lib/hooks/usePerfis';
import { Brain, Target, MessageCircle, Repeat, Network, User, Search, NotebookPen, Sun, Moon } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Brain },
  { href: '/perfis', label: 'Perfis', icon: User },
  { href: '/objetivos', label: 'Objetivos', icon: Target },
  { href: '/pesquisa', label: 'Pesquisa', icon: Search },
  { href: '/diario', label: 'Diário', icon: NotebookPen },
  { href: '/revisao', label: 'Revisão', icon: Repeat },
  { href: '/tutor', label: 'Tutor', icon: MessageCircle },
  { href: '/knowledge-graph', label: 'Grafo', icon: Network },
];

export function Navigation() {
  const pathname = usePathname();
  const { data: perfis = [] } = usePerfis();
  const { perfilSelecionado, selecionarPerfil } = useAppStore();
  const { resolvedTheme, setTheme } = useTheme();
  // Só renderiza o ícone correto após montar no cliente (evita mismatch de hydration).
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const temaEscuro = resolvedTheme === 'dark';

  return (
    <header className="border-b bg-background/95 backdrop-blur shadow-sm supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Brain className="h-6 w-6 text-primary" />
          <span>MindForge</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Button
                key={item.href}
                variant={active ? 'secondary' : 'ghost'}
                size="sm"
                asChild
              >
                <Link href={item.href} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(temaEscuro ? 'light' : 'dark')}
            aria-label={
              montado && temaEscuro
                ? 'Mudar para tema claro'
                : 'Mudar para tema escuro'
            }
          >
            {montado && temaEscuro ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <Select
            value={perfilSelecionado?.id || ''}
            onValueChange={(id) => {
              const perfil = perfis.find((p) => p.id === id);
              selecionarPerfil(perfil || null);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecionar perfil" />
            </SelectTrigger>
            <SelectContent>
              {perfis.map((perfil) => (
                <SelectItem key={perfil.id} value={perfil.id}>
                  {perfil.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <nav className="md:hidden border-t">
        <div className="container mx-auto px-4 py-2 flex items-center justify-around gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Button
                key={item.href}
                variant={active ? 'secondary' : 'ghost'}
                size="icon"
                className="shrink-0"
                asChild
              >
                <Link href={item.href}>
                  <Icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </Button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
