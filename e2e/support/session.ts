import type { Page } from '@playwright/test'

/** Monday 5 October 2026, 10:00 in Paris: a school day, out of the holidays. */
export const MONDAY = new Date('2026-10-05T08:00:00Z')

/**
 * Signs in through the Auth emulator's stand-in for Google: same `signInWithPopup` as in
 * production, but the popup is the emulator's page, driven by its own element ids. That page wires
 * its buttons only once its scripts, fetched from a CDN, have run: a click before `load` is lost.
 */
export async function signInAs(page: Page, email: string): Promise<void> {
  await page.goto('/')
  const popupOpened = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Se connecter avec Google' }).click()
  const popup = await popupOpened
  await popup.waitForLoadState('load')
  await popup.getByRole('button', { name: 'Add new account' }).click()
  await popup.locator('#email-input').fill(email)
  const closed = popup.waitForEvent('close')
  await popup.locator('#sign-in').click()
  await closed
}
