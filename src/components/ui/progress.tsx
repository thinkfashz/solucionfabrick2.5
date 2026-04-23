import * as React from 'react';

import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    const safe = Math.max(0, Math.min(100, Math.round(value)));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-white/10', className)}
        {...props}
      >
        <div
          className="h-full rounded-full bg-yellow-400 transition-all duration-500"
          style={{ width: `${safe}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };
