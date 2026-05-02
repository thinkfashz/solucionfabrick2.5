'use client';

import React from 'react';
import { motion, type MotionProps, type Transition } from 'framer-motion';

import { cn } from '@/lib/utils';

type MotionElementTag = 'button' | 'a' | 'div' | 'span';

export type AnimatedButtonProps = {
  as?: MotionElementTag;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps | 'children'> &
  // Allow common anchor/button extras (href, type, disabled, target, rel, etc.)
  Partial<Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'download'>> &
  Partial<Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled' | 'name' | 'value' | 'form'>> &
  MotionProps;

const defaultTransition = {
  stiffness: 20,
  damping: 15,
  mass: 2,
  scale: {
    type: 'spring' as const,
    stiffness: 10,
    damping: 5,
    mass: 0.1,
  },
} as unknown as Transition;

const AnimatedButton = React.forwardRef<HTMLElement, AnimatedButtonProps>(
  (
    {
      children,
      className = '',
      as = 'button',
      whileTap = { scale: 0.97 },
      transition = defaultTransition,
      ...rest
    },
    ref,
  ) => {
    const Component = ((motion as unknown) as Record<string, React.ElementType>)[as] || motion.button;

    // The polymorphic motion components accept all these props at runtime; cast loosely so TS
    // doesn't trip on the union of intrinsic attributes across button/a/div/span.
    const Cmp = Component as React.ComponentType<Record<string, unknown>>;

    return (
      <Cmp
        ref={ref}
        className={cn(className)}
        whileTap={whileTap}
        transition={transition}
        {...rest}
      >
        {children}
      </Cmp>
    );
  },
);

AnimatedButton.displayName = 'AnimatedButton';

export default AnimatedButton;
export { AnimatedButton };
