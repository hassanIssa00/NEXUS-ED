'use client';

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { format } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function dateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  minDate?: Date;
  locale?: 'ar' | 'en';
  disabled?: boolean;
  className?: string;
};

export function DatePicker({
  value, onChange, placeholder, ariaLabel, minDate, locale, disabled, className,
}: DatePickerProps) {
  const appLocale = useLocale();
  const selectedLocale = locale ?? (appLocale === 'en' ? 'en' : 'ar');
  const resolvedPlaceholder = placeholder ?? (selectedLocale === 'en' ? 'Choose a date' : 'اختر التاريخ');
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseDate(value), [value]);
  const localeObject = selectedLocale === 'en' ? enUS : arSA;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel || resolvedPlaceholder}
          aria-expanded={open}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-input bg-background px-3.5 text-start text-sm shadow-sm transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? format(selected, 'PPP', { locale: localeObject }) : resolvedPlaceholder}
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" dir={selectedLocale === 'en' ? 'ltr' : 'rtl'} className="w-auto rounded-2xl border bg-popover p-2 shadow-xl">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (!date) return;
            onChange(dateInputValue(date));
            setOpen(false);
          }}
          disabled={minDate ? { before: new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) } : undefined}
          locale={localeObject}
          dir={selectedLocale === 'en' ? 'ltr' : 'rtl'}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
