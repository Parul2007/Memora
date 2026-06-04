import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  noPadding?: boolean;
}

export default function Card({ children, className = '', onClick, noPadding = false }: CardProps) {
  return (
    <div 
      className={`bg-white border border-[#e7e5e4] rounded-xl ${noPadding ? '' : 'p-6'} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
