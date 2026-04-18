/**
 * Ethiopian Calendar (Ge'ez / Ethiopic) utilities
 *
 * The Ethiopian calendar (Ge'ez calendar) has 13 months:
 *   - 12 months of 30 days each
 *   - 1 intercalary month (Pagume) of 5 days (6 in leap years)
 *
 * Ethiopian New Year (Enkutatash) falls on September 11 (or 12 in Gregorian
 * leap years). The Ethiopian year is ~7–8 years behind the Gregorian year.
 *
 * Ethiopian time starts at 6:00 AM (Gregorian) = 12:00 (Ethiopian hour 0).
 * So Ethiopian hour = (Gregorian hour + 6) % 12, with AM/PM shifted by 6 h.
 *
 * Epoch: JDN 1723856 = 27 August 8 CE (Proleptic Gregorian) = 1 Meskerem 1 AM
 */

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
 * Uses the standard JDN-based algorithm with epoch JDN 1723856.
 */
export function gregorianToEthiopian(date: Date): EthiopianDate {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();

  // Gregorian → Julian Day Number
  const a = Math.floor((14 - gm) / 12);
  const y = gy + 4800 - a;
  const m = gm + 12 * a - 3;
  const jdn =
    gd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  // JDN → Ethiopian (epoch = JDN 1723856)
  const ET_EPOCH = 1723856;
  const r = (jdn - ET_EPOCH) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const etYear =
    4 * Math.floor((jdn - ET_EPOCH) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460);
  const etMonth = Math.floor(n / 30) + 1;
  const etDay = (n % 30) + 1;

  // Day of week: JDN 0 = Monday; adjust so 0 = Sunday
  const dayOfWeek = (jdn + 1) % 7;

  return { year: etYear, month: etMonth, day: etDay, dayOfWeek };
}

// ── Ethiopian time ─────────────────────────────────────────────────────────

export interface EthiopianTime {
  hour: number;   // 1–12 Ethiopian
  minute: number;
  second: number;
  period: 'ጠዋት' | 'ከሰዓት' | 'ማታ' | 'ሌሊት'; // morning / afternoon / evening / night
  periodEn: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
}

/**
 * Convert a JS Date's local time to Ethiopian time.
 * Ethiopian clock starts at 6:00 AM Gregorian (= 12:00 Ethiopian, start of day).
 */
export function toEthiopianTime(date: Date): EthiopianTime {
  const gHour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  // Shift by 6 hours
  const etHour24 = (gHour + 6) % 24;
  const hour = etHour24 % 12 === 0 ? 12 : etHour24 % 12;

  let period: EthiopianTime['period'];
  let periodEn: EthiopianTime['periodEn'];

  if (gHour >= 6 && gHour < 12) {
    period = 'ጠዋት'; periodEn = 'Morning';
  } else if (gHour >= 12 && gHour < 18) {
    period = 'ከሰዓት'; periodEn = 'Afternoon';
  } else if (gHour >= 18 && gHour < 21) {
    period = 'ማታ'; periodEn = 'Evening';
  } else {
    period = 'ሌሊት'; periodEn = 'Night';
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