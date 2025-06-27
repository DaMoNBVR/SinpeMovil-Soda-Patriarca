// src/utils/dateUtils.ts
export function getLocalDateString(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
}


// utils/dateUtils.ts
export function getLocalDate(dateStr: string): Date {
  const utcDate = new Date(dateStr);
  return new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000);
}
