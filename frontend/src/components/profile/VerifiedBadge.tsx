'use client';

import { CheckCircle2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  verificationType?: 'identity' | 'celebrity' | 'official' | string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const typeColors = {
  identity: 'text-blue-500',
  celebrity: 'text-purple-500',
  official: 'text-emerald-500',
  default: 'text-blue-500',
};

const typeLabels: Record<string, string> = {
  identity: 'Verified Identity',
  celebrity: 'Celebrity Account',
  official: 'Official Account',
};

export function VerifiedBadge({
  verificationType = 'identity',
  size = 'md',
  showTooltip = true,
  className,
}: VerifiedBadgeProps) {
  const colorClass = typeColors[verificationType as keyof typeof typeColors] || typeColors.default;
  const label = typeLabels[verificationType] || 'Verified';

  const badge = (
    <CheckCircle2
      className={cn(
        sizeClasses[size],
        colorClass,
        'inline-block flex-shrink-0',
        className
      )}
      aria-label={label}
    />
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center">{badge}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface VerifiedNameProps {
  name: string;
  isVerified: boolean;
  verificationType?: string;
  badgeSize?: 'sm' | 'md' | 'lg';
  className?: string;
  nameClassName?: string;
}

export function VerifiedName({
  name,
  isVerified,
  verificationType,
  badgeSize = 'sm',
  className,
  nameClassName,
}: VerifiedNameProps) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className={nameClassName}>{name}</span>
      {isVerified && (
        <VerifiedBadge
          verificationType={verificationType}
          size={badgeSize}
        />
      )}
    </span>
  );
}
