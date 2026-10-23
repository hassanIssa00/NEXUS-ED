'use client';

import { Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const timeOptions = Array.from({ length: 96 }, (_, index) => {
  const minutes = index * 15;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const label = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC',
  }).format(new Date(Date.UTC(2020, 0, 1, hour, minute)));
  return { value, label };
});

type TimeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  minValue?: string;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function TimeSelect({ value, onChange, minValue, placeholder = 'اختر الوقت', ariaLabel, disabled, className }: TimeSelectProps) {
  const hasCustomValue = Boolean(value) && !timeOptions.some((option) => option.value === value);
  const customDate = hasCustomValue
    ? new Date(Date.UTC(2020, 0, 1, Number(value.slice(0, 2)), Number(value.slice(3, 5))))
    : undefined;
  const customLabel = customDate
    ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(customDate)
    : '';

  return (
    <div className="relative">
      <Clock3 aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <select
        value={value}
        required
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        className={cn(
          'h-11 w-full appearance-none rounded-xl border border-input bg-background py-2 ps-10 pe-3 text-sm shadow-sm transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        <option value="">{placeholder}</option>
        {hasCustomValue && <option value={value}>{customLabel}</option>}
        {timeOptions.map((option) => <option key={option.value} value={option.value} disabled={Boolean(minValue && option.value < minValue)}>{option.label}</option>)}
      </select>
    </div>
  );
}
