import type { Page } from '@playwright/test'

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
