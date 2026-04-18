declare module 'ethiopian-date' {
  /**
   * Convert Gregorian date to Ethiopian date.
   * @returns [year, month, day] in Ethiopian calendar
   */
  export function toEthiopian(year: number, month: number, day: number): [number, number, number];

  /**
   * Convert Ethiopian date to Gregorian date.
   * @returns [year, month, day] in Gregorian calendar
   */
  export function toGregorian(year: number, month: number, day: number): [number, number, number];
}
