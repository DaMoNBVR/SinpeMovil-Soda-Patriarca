// utils/dateUtils.ts

export function getLocalDateString(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
}

export function getLocalDate(dateStr: string): Date {
  const utcDate = new Date(dateStr);
  return new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000);
}

export function groupEventsByWeek<T extends { date: string; amount: number }>(
  events: T[]
): { startDate: Date; events: T[]; total: number; key: string }[] {
  const grouped: Record<string, { startDate: Date; events: T[]; total: number }> = {};

  for (const event of events) {
    const date = getLocalDate(event.date);
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    const key = `${year}-W${week}`;

    if (!grouped[key]) {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      grouped[key] = { startDate: startOfWeek, events: [], total: 0 };
    }

    grouped[key].events.push(event);
    grouped[key].total += event.amount;
  }

  return Object.entries(grouped).map(([key, value]) => ({
    key,
    ...value,
  }));
}

export function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getAllWeeksInRange(
  start: Date,
  end: Date
): { label: string; key: string; startDate: Date }[] {
  const weeks: { label: string; key: string; startDate: Date }[] = [];
  const current = new Date(start);
  current.setDate(current.getDate() - current.getDay());

  while (current <= end) {
    const year = current.getFullYear();
    const week = getWeekNumber(current);
    const key = `${year}-W${week}`;
    const label = `Semana del ${current.toLocaleDateString('es-CR')}`;

    weeks.push({ label, key, startDate: new Date(current) });
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}