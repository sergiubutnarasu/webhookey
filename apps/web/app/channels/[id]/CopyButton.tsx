'use client';

import { useState } from 'react';
import { ClipboardCopy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Channel URL copied to clipboard.',
        variant: 'default',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: 'Error',
        description: 'Failed to copy URL to clipboard.',
        variant: 'destructive',
      });
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            aria-label={copied ? 'Copied!' : 'Copy channel URL'}
            className="relative"
          >
            <ClipboardCopy
              className={`absolute transition-opacity duration-300 ${copied ? 'opacity-0' : 'opacity-100'}`}
            />
            <Check
              className={`text-green-500 transition-opacity duration-300 ${copied ? 'opacity-100' : 'opacity-0'}`}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy channel URL</p>
          <TooltipArrow className="TooltipArrow" />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
