// Week runs Saturday (6) to Friday (5)
// All dates use UTC to keep things consistent

export function getTodayKey(): string {
  return formatDateKey(new Date());
}

export function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function getWeekRange(date: Date): { start: string; end: string; dates: string[] } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = d.getUTCDay(); // 0=Sun, 6=Sat

  // Find the Saturday that starts this week
  // If today is Saturday (6), start is today
  // If today is Sunday (0), start was yesterday
  // If today is Monday (1), start was 2 days ago
  // Formula: (dayOfWeek + 1) % 7 gives days since Saturday
  const daysSinceSaturday = (dayOfWeek + 1) % 7;
  const saturday = new Date(d);
  saturday.setUTCDate(saturday.getUTCDate() - daysSinceSaturday);

  const friday = new Date(saturday);
  friday.setUTCDate(friday.getUTCDate() + 6);

  const dates: string[] = [];
  const cursor = new Date(saturday);
  for (let i = 0; i < 7; i++) {
    dates.push(formatDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    start: formatDateKey(saturday),
    end: formatDateKey(friday),
    dates,
  };
}

export function getWeekLabel(start: string, end: string): string {
  const s = parseDate(start);
  const e = parseDate(end);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[s.getUTCMonth()]} ${s.getUTCDate()} - ${months[e.getUTCMonth()]} ${e.getUTCDate()}, ${e.getUTCFullYear()}`;
}

export function getPreviousWeeks(count: number): { start: string; end: string; dates: string[] }[] {
  const weeks: { start: string; end: string; dates: string[] }[] = [];
  const now = new Date();

  // Start from current week and go backwards
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const week = getWeekRange(d);
    // Avoid duplicates
    if (!weeks.some(w => w.start === week.start)) {
      weeks.push(week);
    }
  }

  return weeks;
}

export function getDayName(dateKey: string): string {
  const d = parseDate(dateKey);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getUTCDay()];
}

export function getFullDayName(dateKey: string): string {
  const d = parseDate(dateKey);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getUTCDay()];
}
