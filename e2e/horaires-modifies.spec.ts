import { expect, test } from '@playwright/test'
import { addDays, dayIndex, parisToday } from '../src/planning/dates'
import { isHoliday, ZONE_A_2026_2027 } from '../src/planning/holidays'
import { resetEmulators, seedFixture } from './support/emulators'
import { openNextSchoolDay, signInAs } from './support/session'

test.beforeAll(async () => {
  await resetEmulators()
  seedFixture()
})

/** Same day as `openNextSchoolDay` opens: the first school day after today. */
function nextSchoolDay(): string {
  let day = addDays(parisToday(new Date()), 1)
  while (dayIndex(day) >= 5 || isHoliday(ZONE_A_2026_2027, day)) {
    day = addDays(day, 1)
  }
  return day
}

test("avance la sortie d'un enfant et fait apparaître le retour au collège à prendre", async ({
  page,
}) => {
  await signInAs(page, 'camille@exemple.fr')
  test.skip(!(await openNextSchoolDay(page)), "aucun jour d'école dans les deux semaines affichées")

  // Wednesday: an exit from 11:30 on stays on the 13:15 trip, so go earlier than that.
  // Alice's usual exit is never 12:30 nor 10:20 in the fictitious data, nor 17:00 here.
  const time = dayIndex(nextSchoolDay()) === 2 ? '10:20' : '12:30'

  const chip = page.locator('button[aria-expanded]').filter({ hasText: /^Alice/ })
  await chip.click()
  await page
    .getByRole('radiogroup', { name: "Présence d'Alice" })
    .getByRole('radio', { name: 'Présente · horaires modifiés' })
    .click()
  await page
    .getByRole('radiogroup', { name: "Heure de sortie d'Alice" })
    .getByRole('radio', { name: time })
    .click()

  const retour = page.getByRole('region', { name: 'Retour' })
  const trip = retour
    .getByRole('listitem')
    .filter({ hasText: 'Collège → Maison' })
    .filter({ hasText: time })
  await expect(trip).toBeVisible()
  await expect(trip.getByRole('button', { name: 'Alice', exact: true })).toBeVisible()
  await expect(trip.getByRole('button', { name: /^Je prends/ })).toBeVisible()

  await expect(chip).toHaveText(new RegExp(`^Alice · \\d\\d:\\d\\d – ${time}$`))

  await page
    .getByRole('radiogroup', { name: "Présence d'Alice" })
    .getByRole('radio', { name: 'Présente · covoiturage normal' })
    .click()
  await expect(chip).toHaveText('Alice')
  await expect(retour.getByRole('listitem').filter({ hasText: time })).toHaveCount(0)
})
