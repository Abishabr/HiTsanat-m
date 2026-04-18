/**
 * Ethiopian Calendar (Ge'ez / Ethiopic) utilities
 *
 * Date conversion uses the `ethiopian-date` npm package (MIT, no deps)
 * which implements the standard JDN-based algorithm.
 *
 * Ethiopian time:
 *   The Ethiopian clock starts at 6:00 AM Gregorian = 1:00 ጠዋት (morning).
 *   etHour24 = (gregorianHour + 6) % 24
 *
 * Periods (based on etHour24):
 *   ጠዋት  Morning  : etH24 12–17  (Greg  6:00–11:59)
 *   ቀን   Daytime  : etH24 18–23  (Greg 12:00–17:59)
 *   ማታ   Evening  : etH24  0– 5  (Greg 18:00–23:59)
 *   ሌሊት  Night    : etH24  6–11  (Greg  0:00– 5:59)
 */

import { toEthiopian as libToEthiopian } from 'ethiopian-date';

// ── Month names ────────────────────────────────────────────────────────────

export const ET_MONTHS_AMHARIC = [
  'መስከረም', // 1  Meskerem  (Sep 11 – Oct 10)
  'ጥቅምት',   // 2  Tikimt    (Oct 11 – Nov 9)
  'ህዳር',    // 3  Hidar     (Nov 10 – Dec 9)
  'ታህሳስ',   // 4  Tahsas    (Dec 10 – Jan 8)
  'ጥር',     // 5  Tir       (Jan 9  – Feb 7)
  'የካቲት',   // 6  Yekatit   (Feb 8  – Mar 9)
  'መጋቢት',   // 7  Megabit   (Mar 10 – Apr 8)
  'ሚያዚያ',   // 8  Miyazia   (Apr 9  – May 8)
  'ግንቦት',   // 9  Ginbot    (May 9  – Jun 7)
  'ሰኔ',     // 10 Sene      (Jun 8  – Jul 7)
  'ሐምሌ',    // 11 Hamle     (Jul 8  – Aug 6)
  'ነሐሴ',    // 12 Nehase    (Aug 7  – Sep 5)
  'ጳጉሜ',    // 13 Pagume    (Sep 6  – Sep 10/11)
];

export const ET_MONTHS_ENGLISH = [
  'Meskerem', 'Tikimt',  'Hidar',   'Tahsas',
  'Tir',      'Yekatit', 'Megabit', 'Miyazia',
  'Ginbot',   'Sene',    'Hamle',   'Nehase',
  'Pagume',
];

export const ET_DAYS_AMHARIC = [
  'እሑድ',   // Sunday
  'ሰኞ',    // Monday
  'ማክሰኞ', // Tuesday
  'ረቡዕ',   // Wednesday
  'ሐሙስ',  // Thursday
  'ዓርብ',   // Friday
  'ቅዳሜ',  // Saturday
];

export const ET_DAYS_ENGLISH = [
  'Ehud', 'Segno', 'Maksegno', 'Rebu', 'Hamus', 'Arb', 'Kidame',
];

// ── Ge'ez numerals ─────────────────────────────────────────────────────────

const GEEZ_ONES = ['', '፩', '፪', '፫', '፬', '፭', '፮', '፯', '፰', '፱'];
const GEEZ_TENS = ['', '፲', '፳', '፴', '፵', '፶', '፷', '፸', '፹', '፺'];

export function toGeezNumeral(n: number): string {
  if (n <= 0) return '';
  if (n === 100) return '፻';
  if (n > 100) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return (h > 1 ? GEEZ_ONES[h] : '') + '፻' + (r > 0 ? toGeezNumeral(r) : '');
  }
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return GEEZ_TENS[tens] + GEEZ_ONES[ones];
}

// ── Core conversion: Gregorian → Ethiopian ────────────────────────────────

export interface EthiopianDate {
  year: number;
  month: number;     // 1–13
  day: number;       // 1–30 (1–5/6 for Pagume)
  dayOfWeek: number; // 0 = Sunday
}

/**
 * Convert a JavaScript Date (Gregorian) to an Ethiopian date.
 * Uses the `ethiopian-date` npm library for accurate conversion.
 */
export function gregorianToEthiopian(date: Date): EthiopianDate {
  const [etYear, etMonth, etDay] = libToEthiopian(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );

  // JS getDay(): 0=Sunday … 6=Saturday
  const dayOfWeek = date.getDay();

  return { year: etYear, month: etMonth, day: etDay, dayOfWeek };
}

/**
 * Convert a Gregorian date string (YYYY-MM-DD) to an Ethiopian date.
 * Uses noon UTC to avoid timezone edge cases.
 */
export function gregorianStringToEthiopian(dateStr: string): EthiopianDate {
  const date = new Date(dateStr + 'T12:00:00');
  return gregorianToEthiopian(date);
}

// ── Ethiopian time ─────────────────────────────────────────────────────────

export interface EthiopianTime {
  hour: number;   // 1–12 Ethiopian
  minute: number;
  second: number;
  /** Ethiopian period in Amharic */
  period: 'ጠዋት' | 'ቀን' | 'ማታ' | 'ሌሊት';
  /** Ethiopian period in English */
  periodEn: 'Morning' | 'Daytime' | 'Evening' | 'Night';
}

/**
 * Convert a JS Date's local time to Ethiopian time.
 *
 * Ethiopian clock starts at 6:00 AM Gregorian = 1:00 ጠዋት.
 * etHour24 = (gregorianHour + 6) % 24
 *
 * Period boundaries (etHour24):
 *   ጠዋት Morning  12–17  (Greg  6:00–11:59)
 *   ቀን   Daytime  18–23  (Greg 12:00–17:59)
 *   ማታ   Evening   0– 5  (Greg 18:00–23:59)
 *   ሌሊት  Night     6–11  (Greg  0:00– 5:59)
 */
export function toEthiopianTime(date: Date): EthiopianTime {
  const gHour  = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  const etHour24 = (gHour + 6) % 24;
  // Convert to 1–12 display hour
  const hour = etHour24 % 12 === 0 ? 12 : etHour24 % 12;

  let period: EthiopianTime['period'];
  let periodEn: EthiopianTime['periodEn'];

  if (etHour24 >= 12 && etHour24 < 18) {
    period = 'ጠዋት';  periodEn = 'Morning';
  } else if (etHour24 >= 18) {
    period = 'ቀን';   periodEn = 'Daytime';
  } else if (etHour24 < 6) {
    period = 'ማታ';   periodEn = 'Evening';
  } else {
    period = 'ሌሊት';  periodEn = 'Night';
  }

  return { hour, minute, second, period, periodEn };
}

// ── Formatted strings ──────────────────────────────────────────────────────

export function formatEthiopianDate(
  etDate: EthiopianDate,
  lang: 'am' | 'en' = 'am',
): string {
  const months = lang === 'am' ? ET_MONTHS_AMHARIC : ET_MONTHS_ENGLISH;
  const days   = lang === 'am' ? ET_DAYS_AMHARIC   : ET_DAYS_ENGLISH;
  const month  = months[etDate.month - 1] ?? '';
  const day    = lang === 'am' ? toGeezNumeral(etDate.day) : String(etDate.day);
  const year   = lang === 'am' ? toGeezNumeral(etDate.year) : String(etDate.year);
  const dow    = days[etDate.dayOfWeek] ?? '';
  return lang === 'am'
    ? `${dow}፣ ${month} ${day} ${year} ዓ.ም`
    : `${dow}, ${month} ${day}, ${year} E.C.`;
}

export function formatEthiopianTime(etTime: EthiopianTime, lang: 'am' | 'en' = 'am'): string {
  const mm = String(etTime.minute).padStart(2, '0');
  const ss = String(etTime.second).padStart(2, '0');
  if (lang === 'am') {
    return `${etTime.hour}:${mm}:${ss} ${etTime.period}`;
  }
  return `${etTime.hour}:${mm}:${ss} ${etTime.periodEn}`;
}

/**
 * Format an Ethiopian date for display in the weekly programs calendar.
 * Returns e.g. "ሚያዚያ ፲ ፳፻፲፰ ዓ.ም" or "Miyazia 10, 2018 E.C."
 */
export function formatEthiopianDateShort(etDate: EthiopianDate, lang: 'am' | 'en' = 'en'): string {
  const months = lang === 'am' ? ET_MONTHS_AMHARIC : ET_MONTHS_ENGLISH;
  const month  = months[etDate.month - 1] ?? '';
  if (lang === 'am') {
    return `${month} ${toGeezNumeral(etDate.day)} · ${toGeezNumeral(etDate.year)} ዓ.ም`;
  }
  return `${month} ${etDate.day}, ${etDate.year} E.C.`;
}
