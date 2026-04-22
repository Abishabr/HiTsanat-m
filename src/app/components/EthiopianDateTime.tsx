import { useState, useEffect } from 'react';
import {
  gregorianToEthiopian,
  toEthiopianTime,
  formatEthiopianDate,
  formatEthiopianTime,
  ET_MONTHS_AMHARIC,
  ET_MONTHS_ENGLISH,
  ET_DAYS_AMHARIC,
  toGeezNumeral,
} from '../lib/ethiopianCalendar';

// ── Compact widget for the sidebar ─────────────────────────────────────────

export function EthiopianDateTimeSidebar() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const etDate = gregorianToEthiopian(now);
  const etTime = toEthiopianTime(now);

  const monthAm = ET_MONTHS_AMHARIC[etDate.month - 1] ?? '';
  const dayAm   = toGeezNumeral(etDate.day);
  const yearAm  = toGeezNumeral(etDate.year);
  const dowAm   = ET_DAYS_AMHARIC[etDate.dayOfWeek] ?? '';

  const mm = String(etTime.minute).padStart(2, '0');
  const ss = String(etTime.second).padStart(2, '0');

  return (
    <div className="mx-4 mb-4 rounded-lg p-3 bg-white/10 border border-white/20 text-white">
      {/* Amharic date */}
      <div className="text-center mb-2">
        <p className="text-[10px] text-white/60 uppercase tracking-widest mb-0.5">Ethiopian Date</p>
        <p className="text-sm font-semibold leading-tight">{dowAm}</p>
        <p className="text-xs text-white/80">
          {monthAm} {dayAm} · {yearAm} <span className="text-white/50">ዓ.ም</span>
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-white/20 my-2" />

      {/* Ethiopian time */}
      <div className="text-center">
        <p className="text-[10px] text-white/60 uppercase tracking-widest mb-0.5">Ethiopian Time</p>
        <p className="text-lg font-bold tabular-nums leading-none">
          {etTime.hour}:{mm}:{ss}
        </p>
        <p className="text-xs text-white/70 mt-0.5">{etTime.period}</p>
      </div>
    </div>
  );
}

// ── Compact inline badge for the top bar ──────────────────────────────────

export function EthiopianDateBadge() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const etDate = gregorianToEthiopian(now);
  const etTime = toEthiopianTime(now);

  const monthEn = ET_MONTHS_ENGLISH[etDate.month - 1] ?? '';
  const mm = String(etTime.minute).padStart(2, '0');

  return (
    <div className="hidden md:flex flex-col items-end leading-tight">
      <span className="text-xs font-medium text-foreground">
        {monthEn} {etDate.day}, {etDate.year} E.C.
      </span>
      <span className="text-[11px] text-muted-foreground">
        {etTime.hour}:{mm} {etTime.periodEn ?? ''} (ET)
      </span>
    </div>
  );
}

// ── Full calendar card (standalone page / modal use) ──────────────────────

export function EthiopianCalendarCard() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const etDate = gregorianToEthiopian(now);
  const etTime = toEthiopianTime(now);

  const amDate = formatEthiopianDate(etDate, 'am');
  const enDate = formatEthiopianDate(etDate, 'en');
  const amTime = formatEthiopianTime(etTime, 'am');
  const enTime = formatEthiopianTime(etTime, 'en');

  const mm = String(etTime.minute).padStart(2, '0');
  const ss = String(etTime.second).padStart(2, '0');

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Ethiopian Calendar</h3>
        <span className="text-xs text-muted-foreground">ኢትዮጵያ ቀን መቁጠሪያ</span>
      </div>

      {/* Big date display */}
      <div className="text-center py-4 rounded-lg bg-primary/10 border border-primary/20">
        <p className="text-4xl font-bold text-primary tabular-nums">{toGeezNumeral(etDate.day)}</p>
        <p className="text-lg font-semibold text-foreground mt-1">{ET_MONTHS_AMHARIC[etDate.month - 1] ?? ''}</p>
        <p className="text-sm text-muted-foreground">{ET_MONTHS_ENGLISH[etDate.month - 1] ?? ''}</p>
        <p className="text-xs text-muted-foreground mt-1">{toGeezNumeral(etDate.year)} ዓ.ም · {etDate.year} E.C.</p>
      </div>

      {/* Day of week */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Day</span>
        <span className="font-medium">
          {ET_DAYS_AMHARIC[etDate.dayOfWeek] ?? ''} · {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][etDate.dayOfWeek] ?? ''}
        </span>
      </div>

      {/* Time */}
      <div className="rounded-lg bg-muted/50 p-4 text-center">
        <p className="text-3xl font-bold tabular-nums text-foreground">
          {etTime.hour}:{mm}:{ss}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {etTime.period} · {etTime.periodEn}
        </p>
      </div>

      {/* Full formatted strings */}
      <div className="space-y-1 text-xs text-muted-foreground border-t border-border pt-3">
        <p className="font-medium text-foreground text-sm">{amDate}</p>
        <p>{enDate}</p>
        <p className="mt-1 font-medium text-foreground text-sm">{amTime}</p>
        <p>{enTime}</p>
      </div>

      {/* Gregorian reference */}
      <div className="text-xs text-muted-foreground border-t border-border pt-3 flex justify-between">
        <span>Gregorian</span>
        <span>{now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}
