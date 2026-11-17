import { type Browser, devices, expect, type Page, test } from '@playwright/test'
import { resetEmulators, seedFixture } from './support/emulators'
import { openNextSchoolDay, signInAs } from './support/session'

test.beforeAll(async () => {
  await resetEmulators()
  seedFixture()
})

const NO_DAY = "aucun jour d'école dans les deux semaines affichées"

function aller(page: Page) {
  return page.getByRole('region', { name: 'Aller' })
}

/** The time of the first trip anyone may take on the Aller, read from its button's name. */
async function firstOpenTime(page: Page): Promise<string> {
  const name = await aller(page)
    .getByRole('button', { name: /^Je prends — trajet de / })
    .first()
    .getAttribute('aria-label')
  const time = /trajet de (\d\d:\d\d)/.exec(name ?? '')?.[1]
  if (time === undefined) {
    throw new Error(`Heure introuvable dans « ${name} ».`)
  }
  return time
}

function tripButton(page: Page, verb: string, time: string) {
  return aller(page).getByRole('button', { name: new RegExp(`^${verb} — trajet de ${time}`) })
}

function tripAt(page: Page, time: string) {
  return aller(page).getByRole('listitem').filter({ hasText: time })
}

/** A second parent, in a browser of their own, on the same phone as the project's. */
async function newPhone(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:4173',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  })
  return context.newPage()
}

test("demande confirmation avant d'annuler, garde le trajet puis le libère", async ({ page }) => {
  await signInAs(page, 'paul@exemple.fr')
  test.skip(!(await openNextSchoolDay(page)), NO_DAY)
  const time = await firstOpenTime(page)

  await tripButton(page, 'Je prends', time).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(tripAt(page, time).getByText('Vous', { exact: true })).toBeVisible()

  await tripButton(page, 'Annuler', time).click()
  const dialog = page.getByRole('alertdialog', { name: 'Ne plus conduire ce trajet ?' })
  await expect(dialog).toBeInViewport({ ratio: 1 })
  await dialog.getByRole('button', { name: 'Garder le trajet' }).click()
  await expect(dialog).toHaveCount(0)

  await page.reload()
  await openNextSchoolDay(page)
  await expect(tripAt(page, time).getByText('Vous', { exact: true })).toBeVisible()

  await tripButton(page, 'Annuler', time).click()
  await dialog.getByRole('button', { name: 'Ne plus conduire' }).click()
  await expect(tripButton(page, 'Je prends', time)).toBeVisible()
  await page.reload()
  await openNextSchoolDay(page)
  await expect(tripButton(page, 'Je prends', time)).toBeVisible()
})

test("reprend le trajet d'un autre parent après confirmation", async ({ page, browser }) => {
  await signInAs(page, 'camille@exemple.fr')
  test.skip(!(await openNextSchoolDay(page)), NO_DAY)
  const time = await firstOpenTime(page)
  await tripButton(page, 'Je prends', time).click()
  await expect(tripAt(page, time).getByText('Vous', { exact: true })).toBeVisible()
  await page.context().close()

  const paul = await newPhone(browser)
  await signInAs(paul, 'paul@exemple.fr')
  await openNextSchoolDay(paul)
  await tripButton(paul, 'Je le prends', time).click()
  const dialog = paul.getByRole('alertdialog', { name: 'Prendre le trajet de Camille ?' })
  await expect(dialog).toBeInViewport({ ratio: 1 })
  await dialog.getByRole('button', { name: 'Prendre le trajet' }).click()
  await expect(tripAt(paul, time).getByText('Vous', { exact: true })).toBeVisible()

  await paul.reload()
  await openNextSchoolDay(paul)
  await expect(tripAt(paul, time).getByText('Vous', { exact: true })).toBeVisible()
  await paul.context().close()
})
