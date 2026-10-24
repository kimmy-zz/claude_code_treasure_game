import { useId } from 'react';
import { motion } from 'motion/react';

interface SegmentedControlProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

// iOS-style segmented control; the white thumb slides between segments
export function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  const id = useId();

  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            className="segment"
            style={selected ? { fontWeight: 600 } : undefined}
            onClick={() => onChange(option.value)}
          >
            {selected && (
              <motion.span
                layoutId={`${id}-thumb`}
                className="segment-thumb"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
