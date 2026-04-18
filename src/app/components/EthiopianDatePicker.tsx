/**
 * EthiopianDatePicker
 *
 * A custom date-picker that lets users navigate and select dates using the
 * Ethiopian (Ge'ez) calendar. The selected value is stored internally as a
 * Gregorian ISO string (YYYY-MM-DD) so it integrates seamlessly with the
 * existing form state.
 *
 * Props:
 *   value    – current Gregorian date string (YYYY-MM-DD) or ''
 *   onChange – called with a new Gregorian date string when a day is picked
 *   label    – field label text (already translated by the parent)
 *   lang     – 'en' | 'am'  (controls month/day name language)
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';
import { toEthiopian, toGregorian } from 'ethiopian-date';
import {
  ET_MONTHS_AMHARIC,
  ET_MONTHS_ENGLISH,
  toGeezNumeral,
  gregorianStringToEthiopian,
} from '../lib/ethiopianCalendar';

// ── helpers ────────────────────────────────────────────────────────────────

/** Days in an Ethiopian month (months 1-12 = 30 days, month 13 = 5 or 6) */
function etDaysInMonth(etYear: number, etMonth: number): number {
  if (etMonth < 13) return 30;
  // Pagume: 6 days in leap year, 5 otherwise
  // Ethiopian leap year: year % 4 === 3
  return etYear % 4 === 3 ? 6 : 5;
}

/** Convert an Ethiopian date to a Gregorian ISO string */
function etToGregorianString(etYear: number, etMonth: number, etDay: number): string {
  const [gYear, gMonth, gDay] = toGregorian(etYear, etMonth, etDay);
  return `${gYear}-${String(gMonth).padStart(2, '0')}-${String(gDay).padStart(2, '0')}`;
}

/** Get today's Ethiopian date */
function todayEthiopian() {
  const now = new Date();
  const [y, m, d] = toEthiopian(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return { year: y, month: m, day: d };
}

// ── component ──────────────────────────────────────────────────────────────

interface Props {
  value: string;          // Gregorian YYYY-MM-DD or ''
  onChange: (v: string) => void;
  label: string;
  lang?: 'en' | 'am';
}

export function EthiopianDatePicker({ value, onChange, label, lang = 'en' }: Props) {
  const today = todayEthiopian();

  // Derive initial calendar view from current value or today
  const initialView = (() => {
    if (value) {
      try {
        const et = gregorianStringToEthiopian(value);
        return { year: et.year, month: et.month };
      } catch {
        // fall through
      }
    }
    return { year: today.year, month: today.month };
  })();

  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      try {
        const et = gregorianStringToEthiopian(value);
        setViewYear(et.year);
        setViewMonth(et.month);
      } catch {
        // ignore
      }
    }
  }, [value]);

  const months = lang === 'am' ? ET_MONTHS_AMHARIC : ET_MONTHS_ENGLISH;
  const daysInMonth = etDaysInMonth(viewYear, viewMonth);

  // Selected Ethiopian date (if any)
  const selectedEt = value ? (() => {
    try { return gregorianStringToEthiopian(value); } catch { return null; }
  })() : null;

  const isSelected = (day: number) =>
    selectedEt !== null &&
    selectedEt.year === viewYear &&
    selectedEt.month === viewMonth &&
    selectedEt.day === day;

  const isToday = (day: number) =>
    today.year === viewYear && today.month === viewMonth && today.day === day;

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(13); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 13) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (day: number) => {
    const greg = etToGregorianString(viewYear, viewMonth, day);
    onChange(greg);
    setOpen(false);
  };

  const clearValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Display text for the trigger button
  const displayText = (() => {
    if (!value) return lang === 'am' ? 'ቀን ይምረጡ' : 'Select date';
    if (!selectedEt) return value;
    const monthName = months[selectedEt.month - 1] ?? '';
    if (lang === 'am') {
      return `${monthName} ${toGeezNumeral(selectedEt.day)} ${toGeezNumeral(selectedEt.year)} ዓ.ም`;
    }
    return `${monthName} ${selectedEt.day}, ${selectedEt.year} E.C.`;
  })();

  // Year navigation: allow ±10 years from today
  const minYear = today.year - 80;
  const maxYear = today.year;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm transition-all
          ${open
            ? 'border-primary ring-2 ring-primary/10'
            : 'border-border hover:border-primary/50'}
          ${value ? 'text-foreground' : 'text-muted-foreground'}
          bg-background`}
      >
        <span className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span>{displayText}</span>
        </span>
        {value && (
          <X
            className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground flex-shrink-0"
            onClick={clearValue}
          />
        )}
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] rounded-xl border border-border bg-card shadow-lg p-3">

          {/* Header: month + year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              disabled={viewYear <= minYear && viewMonth === 1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              {/* Month selector */}
              <select
                value={viewMonth}
                onChange={e => setViewMonth(Number(e.target.value))}
                className="text-sm font-semibold bg-transparent border-none outline-none cursor-pointer text-foreground"
              >
                {months.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>

              {/* Year selector */}
              <select
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
                className="text-sm font-semibold bg-transparent border-none outline-none cursor-pointer text-foreground"
              >
                {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map(y => (
                  <option key={y} value={y}>
                    {lang === 'am' ? `${toGeezNumeral(y)} ዓ.ም` : `${y} E.C.`}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              disabled={viewYear >= maxYear && viewMonth === today.month}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 mb-1">
            {(lang === 'am'
              ? ['እሑ', 'ሰኞ', 'ማክ', 'ረቡ', 'ሐሙ', 'ዓርብ', 'ቅዳ']
              : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
            ).map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid — Ethiopian months always start on a fixed Gregorian weekday.
              We compute the weekday of the 1st day of the viewed month. */}
          {(() => {
            const firstDayGreg = etToGregorianString(viewYear, viewMonth, 1);
            const firstWeekday = new Date(firstDayGreg + 'T12:00:00').getDay(); // 0=Sun

            const cells: React.ReactNode[] = [];

            // Empty cells before the 1st
            for (let i = 0; i < firstWeekday; i++) {
              cells.push(<div key={`e-${i}`} />);
            }

            // Day cells
            for (let day = 1; day <= daysInMonth; day++) {
              const sel = isSelected(day);
              const tod = isToday(day);
              cells.push(
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all
                    ${sel
                      ? 'bg-primary text-white'
                      : tod
                        ? 'border border-primary text-primary'
                        : 'hover:bg-muted text-foreground'
                    }`}
                >
                  {lang === 'am' ? toGeezNumeral(day) : day}
                </button>
              );
            }

            return <div className="grid grid-cols-7 gap-0.5">{cells}</div>;
          })()}

          {/* Today shortcut */}
          <div className="mt-3 pt-2 border-t border-border flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                setViewYear(today.year);
                setViewMonth(today.month);
                selectDay(today.day);
              }}
              className="text-xs text-primary hover:underline"
            >
              {lang === 'am' ? 'ዛሬ' : 'Today'}
            </button>
            <span className="text-[10px] text-muted-foreground">
              {lang === 'am' ? 'የኢትዮጵያ ቀን መቁጠሪያ' : 'Ethiopian Calendar'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
