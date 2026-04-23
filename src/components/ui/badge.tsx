import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-yellow-400/20 text-yellow-400',
        secondary:
          'border-transparent bg-zinc-800 text-zinc-200',
        destructive:
          'border-transparent bg-red-500/20 text-red-400',
        success:
          'border-transparent bg-green-500/20 text-green-400',
        warning:
          'border-transparent bg-amber-400/20 text-amber-400',
        outline:
          'border-white/10 text-zinc-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
