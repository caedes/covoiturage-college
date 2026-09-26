const PARIS_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Today's date in Paris as `YYYY-MM-DD` — the `en-CA` locale formats dates in that order. */
export function parisToday(now: Date): string {
  return PARIS_DATE.format(now)
}
