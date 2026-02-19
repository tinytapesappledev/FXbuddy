import React from 'react';

interface CreditIconProps {
  size?: number;
  className?: string;
}

/**
 * 4-pointed star icon used as the credit currency symbol.
 * Renders inline at the given size, inherits currentColor.
 */
export const CreditIcon: React.FC<CreditIconProps> = ({ size = 12, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    className={`inline-block flex-shrink-0 ${className}`}
  >
    <path d="M8 0C8.9 3.3 12.7 7.1 16 8C12.7 8.9 8.9 12.7 8 16C7.1 12.7 3.3 8.9 0 8C3.3 7.1 7.1 3.3 8 0Z" />
  </svg>
);
