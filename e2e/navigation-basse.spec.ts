import { expect, test } from '@playwright/test'
import { resetEmulators, seedFixture } from './support/emulators'
import { MONDAY, signInAs } from './support/session'

test.beforeAll(async () => {
  await resetEmulators()
  seedFixture()
})

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(MONDAY)
  await signInAs(page, 'paul@exemple.fr')
})

test("« Aujourd'hui » ramène sur le jour courant après un passage par la semaine prochaine", async ({
  page,
}) => {
  await page.getByRole('tab', { name: 'Semaine prochaine' }).click()
  await page.getByRole('button', { name: /^mercredi 14/ }).click()
  await page.getByRole('link', { name: "Aujourd'hui" }).click()
  await expect(page.getByRole('tab', { name: 'Cette semaine' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('button', { name: /^lundi 5/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('se déconnecte par le menu du compte', async ({ page }) => {
  await page.getByRole('button', { name: 'Compte de Paul' }).click()
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click()
  await expect(page.getByRole('button', { name: 'Se connecter avec Google' })).toBeVisible()
})

test('laisse lire le dernier trajet du Retour au-dessus du récapitulatif et de la barre du bas', async ({
  page,
}) => {
  const lastTrip = page.getByRole('region', { name: 'Retour' }).getByRole('listitem').last()
  await expect(lastTrip).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))

  const recap = page
    .getByRole('progressbar', { name: 'Part des trajets couverts' })
    .locator('xpath=..')
  const nav = page.getByRole('navigation', { name: 'Navigation principale' })
  const [trip, recapBox, navBox] = await Promise.all([
    lastTrip.boundingBox(),
    recap.boundingBox(),
    nav.boundingBox(),
  ])
  if (trip === null || recapBox === null || navBox === null) {
    throw new Error('Un des éléments mesurés est absent de la page.')
  }
  expect(trip.y + trip.height).toBeLessThanOrEqual(recapBox.y)
  expect(recapBox.y + recapBox.height).toBeLessThanOrEqual(navBox.y)
})
