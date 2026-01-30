
import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'light' | 'dark' | 'white';
  showText?: boolean;
}

export const VoltxLogo: React.FC<LogoProps> = ({ 
  className = "", 
  size = 40, 
  variant = 'dark',
  showText = true 
}) => {
  const colors = {
    text: variant === 'white' ? '#FFFFFF' : '#1e293b'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} style={{ width: size }}>
      <div style={{ width: size, height: size }} className="overflow-hidden flex items-center justify-center">
        <img 
          src="https://lh3.googleusercontent.com/d/1snOc6lVZIwKa-bnUR39Nxr6DelKUjRmQ" 
          alt="Voltx EV Logo" 
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <span 
          className="mt-1 font-serif italic font-bold tracking-tight text-center whitespace-nowrap"
          style={{ 
            fontSize: `${size * 0.25}px`, 
            color: colors.text 
          }}
        >
          Voltx EV
        </span>
      )}
    </div>
  );
};
