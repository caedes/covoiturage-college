import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { defaultUid, member } from '../../test/fakeAuth'
import { planning } from '../../test/fakePlanning'
import { carpool } from '../../test/planningFixtures'
import { renderRoute } from '../../test/renderRoute'

const WEDNESDAY = '2026-09-30'
const ALLER = { date: WEDNESDAY, direction: 'aller', place: 'centre-bourg', time: '07:40' } as const
const TAKE_ALLER = /^Je prends — trajet de 07:40/

function aller() {
  return screen.getByRole('region', { name: 'Aller' })
}

describe('actions de conducteur', () => {
  it('prend un trajet libre et affiche « Vous »', async () => {
    const user = userEvent.setup()
    const store = planning()
    await renderRoute('/', { planning: store })
    await user.click(within(aller()).getByRole('button', { name: TAKE_ALLER }))
    expect(await within(aller()).findByText('Vous')).toBeInTheDocument()
    expect(store.writes()).toEqual([{ kind: 'take', key: '2026-09-30_aller_centre-bourg_0740' }])
  })

  it('annule un trajet que je conduis', async () => {
    const user = userEvent.setup()
    await renderRoute('/', {
      planning: planning({
        carpools: [carpool({ ...ALLER, driverUid: defaultUid, driverName: 'Sophie' })],
      }),
    })
    await user.click(within(aller()).getByRole('button', { name: /^Annuler — trajet de 07:40/ }))
    expect(await within(aller()).findByText("Personne pour l'instant")).toBeInTheDocument()
  })

  it("reprend le trajet d'un autre parent en le nommant", async () => {
    const user = userEvent.setup()
    const store = planning({ carpools: [carpool(ALLER)] })
    await renderRoute('/', { planning: store })
    await user.click(
      within(aller()).getByRole('button', { name: /^Je le prends — trajet de 07:40/ }),
    )
    expect(await within(aller()).findByText('Vous')).toBeInTheDocument()
    expect(store.writes()[0]).toMatchObject({ kind: 'takeOver', currentDriverUid: 'uid-paul' })
  })

  it('laisse le conducteur remplacé reprendre son trajet', async () => {
    const user = userEvent.setup()
    const store = planning({ carpools: [carpool({ ...ALLER, replacedDriverUid: defaultUid })] })
    await renderRoute('/', { planning: store })
    expect(within(aller()).getByText('Paul a pris votre place')).toBeInTheDocument()
    await user.click(
      within(aller()).getByRole('button', { name: /^Je le prends — trajet de 07:40/ }),
    )
    expect(await within(aller()).findByText('Vous')).toBeInTheDocument()
    expect(store.writes()).toEqual([
      {
        kind: 'takeOver',
        key: '2026-09-30_aller_centre-bourg_0740',
        currentDriverUid: 'uid-paul',
      },
    ])
  })

  it('annonce le parent qui a pris le trajet juste avant, puis ferme l’alerte', async () => {
    const user = userEvent.setup()
    await renderRoute('/', {
      planning: planning({}, { writeOutcome: { status: 'alreadyTaken', driverName: 'Maud' } }),
    })
    await user.click(within(aller()).getByRole('button', { name: TAKE_ALLER }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Maud a pris ce trajet juste avant vous.',
    )
    await user.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it("annonce un échec d'enregistrement et réactive le bouton", async () => {
    const user = userEvent.setup()
    await renderRoute('/', { planning: planning({}, { writeOutcome: { status: 'failed' } }) })
    await user.click(within(aller()).getByRole('button', { name: TAKE_ALLER }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/enregistrement impossible/i)
    await waitFor(() =>
      expect(within(aller()).getByRole('button', { name: TAKE_ALLER })).not.toHaveAttribute(
        'aria-disabled',
        'true',
      ),
    )
  })

  it('annonce un trajet qui ne peut plus être modifié', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { planning: planning({}, { writeOutcome: { status: 'refused' } }) })
    await user.click(within(aller()).getByRole('button', { name: TAKE_ALLER }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce trajet ne peut plus être modifié. Rechargez la page pour voir son état actuel.',
    )
  })

  it('rejoue une même alerte comme un nouveau nœud, réannoncé et retemporisé', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { planning: planning({}, { writeOutcome: { status: 'failed' } }) })
    const button = within(aller()).getByRole('button', { name: TAKE_ALLER })
    await user.click(button)
    const firstAlert = await screen.findByRole('alert')
    await waitFor(() => expect(button).not.toHaveAttribute('aria-disabled', 'true'))
    await user.click(button)
    await waitFor(() => expect(screen.getByRole('alert')).not.toBe(firstAlert))
  })

  it("annonce l'échec d'une écriture rejetée et réactive le bouton", async () => {
    const user = userEvent.setup()
    await renderRoute('/', { planning: planning({}, { writeOutcome: 'reject' }) })
    const button = within(aller()).getByRole('button', { name: TAKE_ALLER })
    await user.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent(/enregistrement impossible/i)
    await waitFor(() => expect(button).not.toHaveAttribute('aria-disabled', 'true'))
  })

  it('confirme un trajet pris pour les lecteurs d’écran', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { planning: planning() })
    await user.click(within(aller()).getByRole('button', { name: TAKE_ALLER }))
    expect(
      await screen.findByText('Vous prenez le trajet de 07:40, Maison → Centre-bourg.'),
    ).toBeInTheDocument()
  })

  it('désactive le bouton tant que l’écriture est en cours', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { planning: planning({}, { writeOutcome: 'pending' }) })
    const button = within(aller()).getByRole('button', { name: TAKE_ALLER })
    await user.click(button)
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveFocus()
  })

  it("n'offre aucune action sur un jour passé", async () => {
    const user = userEvent.setup()
    await renderRoute('/')
    await user.click(screen.getByRole('button', { name: /^lundi 28/ }))
    expect(within(aller()).queryByRole('button')).toBeNull()
  })

  it("n'offre aucune action à un compte enfant", async () => {
    await renderRoute('/', { auth: member({ role: 'child', childId: 'basile', childIds: [] }) })
    expect(within(aller()).queryByRole('button')).toBeNull()
  })

  it('garde désactivés deux trajets pris coup sur coup, tant que leurs écritures sont en cours', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { planning: planning({}, { writeOutcome: 'pending' }) })
    const first = within(aller()).getByRole('button', { name: TAKE_ALLER })
    const second = within(screen.getByRole('region', { name: 'Retour' })).getByRole('button', {
      name: /^Je prends — trajet de 13:15/,
    })
    await user.click(first)
    await user.click(second)
    expect(first).toHaveAttribute('aria-disabled', 'true')
    expect(second).toHaveAttribute('aria-disabled', 'true')
  })
})
