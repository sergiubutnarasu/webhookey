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
    >
      {copied ? (
        <Check className="text-green-500" />
      ) : (
        <ClipboardCopy />
      )}
    </Button>
  );
}
