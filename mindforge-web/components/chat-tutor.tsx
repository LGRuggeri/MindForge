'use client';

import { useState } from 'react';
import { useTirarDuvida } from '@/lib/hooks/useTutor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatTutorProps {
  perfilId: string;
  moduloId: string;
}

export function ChatTutor({ perfilId, moduloId }: ChatTutorProps) {
  const [pergunta, setPergunta] = useState('');
  const [mensagens, setMensagens] = useState<{ pergunta: string; resposta: string }[]>([]);
  const tirarDuvida = useTirarDuvida();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pergunta.trim()) return;
    try {
      const duvida = await tirarDuvida.mutateAsync({
        perfilId,
        moduloId,
        pergunta,
      });
      setMensagens((prev) => [...prev, { pergunta, resposta: duvida.resposta }]);
      setPergunta('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar dúvida');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {mensagens.map((msg, index) => (
          <div key={index} className="space-y-3">
            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <p className="font-medium">{msg.pergunta}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted">
              <CardContent className="p-4 flex items-start gap-3">
                <Bot className="h-5 w-5 mt-0.5 text-primary" />
                <div className="prose prose-neutral dark:prose-invert max-w-none text-sm">
                  <ReactMarkdown>{msg.resposta}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Digite sua dúvida..."
          disabled={tirarDuvida.isPending}
        />
        <Button type="submit" disabled={tirarDuvida.isPending || !pergunta.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
