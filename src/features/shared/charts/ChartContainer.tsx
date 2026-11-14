import type { CSSProperties, ReactNode } from 'react'

interface ChartContainerProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  aspectRatio?: number
  minHeight?: number
  maxHeight?: number
}

export function ChartContainer({
  children,
  className = '',
  style,
  aspectRatio = 16 / 9,
  minHeight = 280,
  maxHeight = 420,
}: ChartContainerProps) {
  return (
    <div
      className={`relative w-full ${className}`}
      style={{
        ...style,
        aspectRatio,
        minHeight,
        maxHeight,
        overflow: 'hidden',
      } as CSSProperties}
    >
      {children}
    </div>
  )
}