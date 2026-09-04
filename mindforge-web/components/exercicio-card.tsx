'use client';

import { useState } from 'react';
import { Exercicio, Tentativa } from '@/types/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ExercicioCardProps {
  exercicio: Exercicio;
  onSubmit: (resposta: string) => Promise<Tentativa | void>;
  disabled?: boolean;
}

export function ExercicioCard({ exercicio, onSubmit, disabled }: ExercicioCardProps) {
  const [resposta, setResposta] = useState('');
  const [feedback, setFeedback] = useState<Tentativa | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const resultado = await onSubmit(resposta);
      if (resultado) setFeedback(resultado);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base">{exercicio.enunciado}</CardTitle>
          <Badge variant="outline" className="capitalize">
            {exercicio.tipo}
          </Badge>
        </div>
        <CardDescription>Dificuldade: {exercicio.dificuldade}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Digite sua resposta..."
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          disabled={disabled || isSubmitting}
        />
        <Button onClick={handleSubmit} disabled={disabled || isSubmitting || !resposta.trim()}>
          Submeter resposta
        </Button>
        {feedback && (
          <div
            className={`rounded-lg p-3 text-sm ${
              feedback.correta ? 'bg-green-500/10 text-green-700' : 'bg-destructive/10 text-destructive'
            }`}
          >
            <p className="font-medium">{feedback.correta ? 'Correto!' : 'Incorreto'}</p>
            {feedback.feedbackIa && <p>{feedback.feedbackIa}</p>}
            {feedback.pontuacao && <p className="text-xs mt-1">Pontuação: {feedback.pontuacao}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
