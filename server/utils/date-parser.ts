/**
 * Date parsing utilities for handling relative and absolute date references
 * Current date context: December 30, 2025
 */

const CURRENT_DATE = new Date('2025-12-30');

export const getCurrentDate = () => CURRENT_DATE;

/**
 * Get the start and end dates for "last month" relative to current date
 * Last month = November 2025
 */
export const getLastMonthRange = (): { startDate: string; endDate: string } => {
  const year = CURRENT_DATE.getFullYear();
  const month = CURRENT_DATE.getMonth(); // 11 (December)

  // Last month is month - 1
  const lastMonth = month - 1; // 10 (November)
  const lastMonthYear = lastMonth < 0 ? year - 1 : year;
  const adjustedLastMonth = lastMonth < 0 ? 11 : lastMonth;

  const startDate = new Date(lastMonthYear, adjustedLastMonth, 1);
  const endDate = new Date(lastMonthYear, adjustedLastMonth + 1, 0); // Last day of month

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
};

/**
 * Get the start and end dates for "this month" relative to current date
 * This month = December 2025
 */
export const getThisMonthRange = (): { startDate: string; endDate: string } => {
  const year = CURRENT_DATE.getFullYear();
  const month = CURRENT_DATE.getMonth(); // 11 (December)

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of month

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
};

/**
 * Get the month before "last month"
 * Month before last = October 2025
 */
export const getMonthBeforeLastRange = (): { startDate: string; endDate: string } => {
  const year = CURRENT_DATE.getFullYear();
  const month = CURRENT_DATE.getMonth(); // 11 (December)

  // Two months ago
  const targetMonth = month - 2; // 9 (October)
  const targetYear = targetMonth < 0 ? year - 1 : year;
  const adjustedMonth = targetMonth < 0 ? 12 + targetMonth : targetMonth;

  const startDate = new Date(targetYear, adjustedMonth, 1);
  const endDate = new Date(targetYear, adjustedMonth + 1, 0);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
};

/**
 * Get date range for a specific month name (e.g., "September", "October")
 * Defaults to 2024 if no year specified, unless it's a recent month
 */
export const getMonthRangeByName = (monthName: string, year?: number): { startDate: string; endDate: string } => {
  const monthMap: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3,
    may: 4, june: 5, july: 6, august: 7,
    september: 8, october: 9, november: 10, december: 11,
  };

  const normalizedMonth = monthName.toLowerCase();
  const monthIndex = monthMap[normalizedMonth];

  if (monthIndex === undefined) {
    throw new Error(`Invalid month name: ${monthName}`);
  }

  // Default to 2024 for historical data, but use 2025 for Nov/Dec
  const targetYear = year || (monthIndex >= 10 ? 2025 : 2024);

  const startDate = new Date(targetYear, monthIndex, 1);
  const endDate = new Date(targetYear, monthIndex + 1, 0);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
};

/**
 * Format date as YYYY-MM-DD
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
