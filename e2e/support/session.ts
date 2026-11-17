import type { Page } from '@playwright/test'
import { addDays, dayIndex, displayedMonday, mondayOf, parisToday } from '../../src/planning/dates'
import { isHoliday, ZONE_A_2026_2027 } from '../../src/planning/holidays'

/** Monday 5 October 2026, 10:00 in Paris: a school day, out of the holidays. */
export const MONDAY = new Date('2026-10-05T08:00:00Z')

/**
 * Signs in through the Auth emulator's stand-in for Google: same `signInWithRedirect` as in
 * production, but the page left for is the emulator's, driven by its own element ids, in the same
 * tab. That page wires its buttons only once its scripts, fetched from a CDN, have run: a click
 * before `load` is lost.
 */
export async function signInAs(page: Page, email: string): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Se connecter avec Google' }).click()
  await page.waitForURL(/\/emulator\/auth\/handler/)
  await page.waitForLoadState('load')
  await page.getByRole('button', { name: 'Add new account' }).click()
  await page.locator('#email-input').fill(email)
  await page.locator('#sign-in').click()
  await page.waitForURL((url) => url.port === '4173')
}

const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']

/**
 * Opens the first school day after today, by the real date: tests that write need it, since the
 * Firestore rules judge the lock with the emulator's own clock (`docs/rules/tests-non-regression.md`).
 * Returns `false` when that day is in neither of the two weeks on screen, as in long holidays.
 */
export async function openNextSchoolDay(page: Page): Promise<boolean> {
  const today = parisToday(new Date())
  let day = addDays(today, 1)
  while (dayIndex(day) >= 5 || isHoliday(ZONE_A_2026_2027, day)) {
    day = addDays(day, 1)
  }
  const current = displayedMonday(today)
  if (mondayOf(day) === addDays(current, 7)) {
    await page.getByRole('tab', { name: 'Semaine prochaine' }).click()
  } else if (mondayOf(day) !== current) {
    return false
  }
  const name = `${DAY_NAMES[dayIndex(day)]} ${Number(day.slice(8, 10))}`
  await page.getByRole('button', { name: new RegExp(`^${name}(,|$)`) }).click()
  return true
}
