import { expect, test } from '@playwright/test'
import { resetEmulators, seedFixture } from './support/emulators'
import { MONDAY, signInAs } from './support/session'

test.beforeAll(async () => {
  await resetEmulators()
  seedFixture()
})

test("ramène au Centre-bourg par le bus de 17:30 l'enfant qui sort à 17:00", async ({ page }) => {
  await page.clock.setFixedTime(MONDAY)
  await signInAs(page, 'paul@exemple.fr')

  const retour = page.getByRole('region', { name: 'Retour' })
  const bus = retour.getByRole('listitem').filter({ hasText: '17:30' })
  await expect(bus).toContainText('Centre-bourg → Maison')
  await expect(bus).toContainText('Basile')
  await expect(retour.getByText('17:45')).toHaveCount(0)
})
