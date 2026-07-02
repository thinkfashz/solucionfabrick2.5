declare module '3dsvg' {
  import type { ComponentType, CSSProperties } from 'react';

  export interface SVG3DProps {
    text: string;
    font?: string;
    smoothness?: number;
    color?: string;
    material?: string;
    metalness?: number;
    roughness?: number;
    texture?: string;
    className?: string;
    style?: CSSProperties;
  }

  export const SVG3D: ComponentType<SVG3DProps>;
}
