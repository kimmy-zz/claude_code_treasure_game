// Format a score as dollars with a true minus sign, e.g. "$100" or "−$50"
export function formatMoney(value: number) {
  return `${value < 0 ? '−' : ''}$${Math.abs(value)}`;
}

// Format a SQLite UTC timestamp the way iOS lists do: "Today, 3:05 PM", "Yesterday, 9:12 AM" or "Oct 12"
export function formatPlayedAt(sqliteDate: string) {
  // SQLite datetime('now') is UTC without a timezone suffix
  const date = new Date(sqliteDate.replace(' ', 'T') + 'Z');
  const now = new Date();
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((dayStart(now) - dayStart(date)) / 86_400_000);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (daysAgo === 0) return `Today, ${time}`;
  if (daysAgo === 1) return `Yesterday, ${time}`;
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}
