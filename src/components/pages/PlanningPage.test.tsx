import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { defaultUid } from '../../test/fakeAuth'
import {
  failingPlanning,
  pendingPlanning,
  planning,
  recoveringPlanning,
} from '../../test/fakePlanning'
import { carpool, childDay } from '../../test/planningFixtures'
import { renderRoute } from '../../test/renderRoute'

const MONDAY = '2026-09-28'
const WEDNESDAY = '2026-09-30'

describe('PlanningPage', () => {
  it('expose un unique h1, les onglets de semaine et la période affichée', async () => {
    await renderRoute('/')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Trajets collège' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Cette semaine' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('28 septembre – 2 octobre')).toBeInTheDocument()
  })

  it("sélectionne aujourd'hui et affiche ses trajets Aller et Retour", async () => {
    await renderRoute('/')
    expect(screen.getByRole('button', { name: /^mercredi 30/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const aller = screen.getByRole('region', { name: 'Aller' })
    expect(within(aller).getByText('07:40')).toBeInTheDocument()
    expect(within(aller).getByText('Maison → Centre-bourg')).toBeInTheDocument()
    const retour = screen.getByRole('region', { name: 'Retour' })
    expect(within(retour).getByText('13:15')).toBeInTheDocument()
    expect(within(retour).getByText('Collège → Maison')).toBeInTheDocument()
  })

  it('change de jour et signale un jour passé', async () => {
    const user = userEvent.setup()
    await renderRoute('/')
    await user.click(screen.getByRole('button', { name: /^lundi 28/ }))
    const retour = screen.getByRole('region', { name: 'Retour' })
    expect(within(retour).getByText('16:00')).toBeInTheDocument()
    expect(within(retour).getByText('17:45')).toBeInTheDocument()
    expect(screen.getByText(/journée passée/i)).toBeInTheDocument()
  })

  it('passe à la semaine prochaine sur son lundi, puis revient sur aujourd’hui', async () => {
    const user = userEvent.setup()
    await renderRoute('/')
    await user.click(screen.getByRole('tab', { name: 'Semaine prochaine' }))
    expect(screen.getByText('5 – 9 octobre')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^lundi 5/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('tab', { name: 'Cette semaine' }))
    expect(screen.getByRole('button', { name: /^mercredi 30/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('affiche le conducteur, « Vous » et le récapitulatif', async () => {
    await renderRoute('/', {
      planning: planning({
        carpools: [
          carpool({ date: WEDNESDAY, direction: 'aller', place: 'centre-bourg', time: '07:40' }),
          carpool({
            date: WEDNESDAY,
            direction: 'retour',
            place: 'college',
            time: '13:15',
            driverUid: defaultUid,
            driverName: 'Sophie',
          }),
        ],
      }),
    })
    expect(
      within(screen.getByRole('region', { name: 'Aller' })).getByText('Paul'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Retour' })).getByText('Vous'),
    ).toBeInTheDocument()
    expect(screen.getByText('2 trajets sur 15 couverts cette semaine')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'mercredi 30, tous les trajets sont couverts' }),
    ).toBeInTheDocument()
  })

  it('affiche la présence, les retraits et les permanences du jour', async () => {
    const user = userEvent.setup()
    await renderRoute('/', {
      planning: planning({
        childDays: [
          childDay({ date: MONDAY, childId: 'alice', presence: 'absent' }),
          childDay({ date: MONDAY, childId: 'basile', skipped: ['aller'] }),
        ],
      }),
    })
    await user.click(screen.getByRole('button', { name: /^lundi 28/ }))
    expect(
      within(screen.getByRole('region', { name: 'Présence' })).getByText('Alice · absente'),
    ).toBeInTheDocument()
    expect(screen.getByText('Sans Basile sur ce trajet')).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Retour' })).getByText(/permanence 17:00/i),
    ).toBeInTheDocument()
  })

  it('bascule sur le lundi qui vient quand on ouvre le planning un samedi', async () => {
    await renderRoute('/', { now: new Date('2026-10-03T08:00:00Z') })
    expect(screen.getByText('5 – 9 octobre')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^lundi 5/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('affiche « Vacances scolaires » pendant les vacances', async () => {
    await renderRoute('/', { now: new Date('2026-10-20T08:00:00Z') })
    expect(screen.getByText(/vacances scolaires/i)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Aller' })).toBeNull()
  })

  it("prévient quand l'emploi du temps n'est pas encore importé", async () => {
    await renderRoute('/', { planning: planning({ timetables: [] }) })
    expect(
      screen.getByText(/emploi du temps de ce jour n'est pas encore disponible/i),
    ).toBeInTheDocument()
  })

  it('annonce le chargement', async () => {
    await renderRoute('/', { planning: pendingPlanning(), waitForSettled: false })
    expect(await screen.findByText(/chargement du planning/i)).toHaveAttribute('role', 'status')
  })

  it('annonce un échec et permet de réessayer', async () => {
    const user = userEvent.setup()
    const refused = failingPlanning()
    await renderRoute('/', { planning: refused })
    expect(screen.getByRole('alert')).toHaveTextContent(/impossible de charger le planning/i)
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(refused.subscribeCalls()).toBe(2)
  })

  it('rétablit le planning après un « Réessayer » réussi', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { planning: recoveringPlanning() })
    expect(screen.getByRole('alert')).toHaveTextContent(/impossible de charger le planning/i)
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'Aller' })).toBeInTheDocument()
  })

  it('se désabonne du planning au démontage', async () => {
    const scenario = planning()
    const result = await renderRoute('/', { planning: scenario })
    result.unmount()
    expect(scenario.unsubscribeCalls()).toBeGreaterThanOrEqual(1)
  })

  it("suit l'horloge et rebascule sur aujourd'hui quand l'onglet redevient visible", async () => {
    let current = new Date('2026-10-02T16:00:00Z')
    await renderRoute('/', { now: () => current })
    expect(screen.getByRole('button', { name: /^vendredi 2/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    current = new Date('2026-10-05T06:00:00Z')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(screen.getByText('5 – 9 octobre')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^lundi 5/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('ne change rien quand le jour est inchangé', async () => {
    const current = new Date('2026-10-02T16:00:00Z')
    await renderRoute('/', { now: () => current })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(screen.getByRole('button', { name: /^vendredi 2/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('permet de choisir un jour au clavier', async () => {
    const user = userEvent.setup()
    await renderRoute('/')
    screen.getByRole('button', { name: /^mercredi 30/ }).focus()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: /^jeudi 1/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
