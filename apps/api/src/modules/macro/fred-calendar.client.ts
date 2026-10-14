const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function centralTimeToUtc(date: string, hour: number, minute: number) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const offsetName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(new Date(localAsUtc))
    .find((part) => part.type === 'timeZoneName')?.value;
  const offset = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(offsetName ?? '');
  if (!offset) {
    throw new Error('Could not determine the US Central Time offset');
  }

  const offsetMinutes =
    (Number(offset[2]) * 60 + Number(offset[3] ?? 0)) *
    (offset[1] === '+' ? 1 : -1);
  return new Date(localAsUtc - offsetMinutes * 60_000);
}

async function fetchCalendarPage(releaseId: number, year: number, page: number) {
  const url = new URL('https://fred.stlouisfed.org/releases/calendar');
  url.searchParams.set('rid', String(releaseId));
  url.searchParams.set('view', 'year');
  url.searchParams.set('vs', `${year}-01-01`);
  url.searchParams.set('ve', `${year}-12-31`);
  url.searchParams.set('pageID', String(page));

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error(`Fetching FRED calendar failed with HTTP ${response.status}`);
  }

  const html = await response.text();
  if (!html.includes('All times are US Central Time')) {
    throw new Error('FRED calendar time zone could not be verified');
  }
  return html;
}

export async function fetchFredReleaseCalendar(releaseId: number, year: number) {
  const releases = new Map<string, Date | null>();
  let page = 1;

  while (true) {
    const html = await fetchCalendarPage(releaseId, year, page);
    if (html.includes('No release dates are available')) {
      return releases;
    }

    let date = '';
    for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
      const row = match[1];
      if (!row) continue;

      const day = /(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/.exec(row);
      if (day && MONTHS.includes(day[1] ?? '')) {
        const month = String(MONTHS.indexOf(day[1] ?? '') + 1).padStart(2, '0');
        date = `${day[3]}-${month}-${(day[2] ?? '').padStart(2, '0')}`;
        continue;
      }

      if (!date || !row.includes(`href="/release?rid=${releaseId}"`)) {
        continue;
      }
      const time = /(\d{1,2}):(\d{2})\s*(am|pm)/i.exec(row);
      if (!time) {
        releases.set(date, null);
        continue;
      }

      const hour = Number(time[1]) % 12 + (time[3]?.toLowerCase() === 'pm' ? 12 : 0);
      releases.set(date, centralTimeToUtc(date, hour, Number(time[2])));
    }

    const count = /Releases\s+\d+\s+-\s+(\d+)\s+of\s+(\d+)/.exec(html);
    if (!count || releases.size === 0) {
      throw new Error(`Could not read FRED calendar for release ${releaseId}`);
    }
    if (Number(count[1]) >= Number(count[2])) {
      return releases;
    }
    page += 1;
  }
}
