import React, { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  color?: 'blue' | 'yellow' | 'green' | 'pink' | 'gray';
  className?: string;
}

const colorStyles = {
  blue: 'bg-[#e0f2fe] text-[#0284c7]',
  yellow: 'bg-[#fef08a] text-[#a16207]',
  green: 'bg-[#dcfce7] text-[#15803d]',
  pink: 'bg-[#fce7f3] text-[#be185d]',
  gray: 'bg-[#f5f5f4] text-[#565449]'
};

export default function Badge({ children, color = 'gray', className = '' }: BadgeProps) {
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${colorStyles[color]} ${className}`}>
      {children}
    </span>
  );
}
