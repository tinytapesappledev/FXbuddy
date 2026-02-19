import React, { useRef, useEffect } from 'react';

interface GlassInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password';
  className?: string;
  multiline?: boolean;
  rows?: number;
  maxRows?: number;
  maxLength?: number;
  showCharCount?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
  multiline = false,
  rows = 4,
  maxRows = 8,
  maxLength,
  showCharCount = false,
  disabled = false,
  autoFocus = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (multiline && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 19;
      const maxHeight = lineHeight * maxRows + 20;
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    }
  }, [value, multiline, maxRows]);

  if (multiline) {
    return (
      <div className={`relative ${className}`}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`
            glass-input w-full px-3 py-2.5 resize-none
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        {showCharCount && maxLength && (
          <span className="absolute bottom-2 right-3 text-[10px] text-text-tertiary select-none">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    );
  }

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={disabled}
      autoFocus={autoFocus}
      className={`
        glass-input w-full h-10 px-3
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    />
  );
};
