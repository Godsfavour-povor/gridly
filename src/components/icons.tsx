import type { SVGProps } from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = "h-8 w-auto", width = 132, height = 32 }: LogoProps) {
  return (
    <Image
      src="/gridly-logo.png"
      alt="Gridly Logo"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
