'use client';

import { useState } from 'react';
import { ClipboardCopy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      aria-label={copied ? 'Copied!' : 'Copy URL'}
      className="relative"
    >
      <ClipboardCopy
        className={`absolute transition-opacity duration-300 ${copied ? 'opacity-0' : 'opacity-100'}`}
      />
      <Check
        className={`text-green-500 transition-opacity duration-300 ${copied ? 'opacity-100' : 'opacity-0'}`}
      />
    </Button>
  );
}
