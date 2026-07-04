import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function CustomSelect({ label, value, onChange, options, placeholder, className = '', disabled = false, icon }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Compute fixed-position dropdown coords to escape overflow:hidden/auto parents
  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const dropdownHeight = Math.min(240, options.length * 42 + 12);
    const openUpward = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight + 8;
    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: viewportHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, [isOpen, options.length]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative space-y-1.5 ${className}`} ref={ref}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between ${icon ? 'pl-11' : 'px-4'} py-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-semibold text-slate-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          <span className={value ? 'text-slate-855 font-semibold text-slate-800' : 'text-slate-400 font-medium'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
            {icon}
          </div>
        )}
      </div>
      {isOpen && (
        <div style={dropdownStyle} className="bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto p-1.5 space-y-1">
          {options.length === 0 ? (
            <div className="px-3.5 py-2.5 text-xs text-slate-400 italic">Không có dữ liệu</div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer border-0 ${
                    isSelected
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
