'use client';
import React from 'react';

export function sparklinePoints(values: number[], width: number, height: number): string {
  if (!values || values.length < 2) return '';
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;
  const stepX = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = Math.round(i * stepX);
      const y = span === 0 ? height / 2 : Math.round(height - ((v - min) / span) * height);
      return `${x},${y}`;
    })
    .join(' ');
}

export default function Sparkline({
  values, width = 96, height = 24, className = '', color = 'var(--chart-1)',
}: { values: number[]; width?: number; height?: number; className?: string; color?: string }) {
  const points = sparklinePoints(values, width, height);
  if (!points) return null;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
