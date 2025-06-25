// src/utils/dateUtils.ts
export function getLocalDateString(date: Date): string {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() + local.getTimezoneOffset()); // Corrige la zona horaria UTC ➜ local
  return local.toISOString().split('T')[0]; // Formato YYYY-MM-DD
}

// utils/dateUtils.ts
export function getLocalDate(dateStr: string): Date {
  const utcDate = new Date(dateStr);
  return new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000);
}
