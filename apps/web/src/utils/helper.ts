export function localMidnightAsIso(dateValue: string): string {
  const [year, month, day] = dateValue.split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error('Invalid date value');
  }
  return new Date(year, month - 1, day).toISOString();
}

export function midnightAfterDateAsISO(dateValue: string): string {
  const [year, month, day] = dateValue.split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error('Invalid date value');
  }
  return new Date(year, month - 1, day + 1).toISOString();
}
