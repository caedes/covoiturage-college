import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { defaultUid, member } from '../../test/fakeAuth'
import { planning } from '../../test/fakePlanning'
import { childDay } from '../../test/planningFixtures'
import { renderRoute } from '../../test/renderRoute'

const WEDNESDAY = '2026-09-30'
const THURSDAY = '2026-10-01'

function parentOf(...childIds: string[]) {
  return member({ childIds })
}

function region(name: 'Présence' | 'Aller' | 'Retour') {
  return screen.getByRole('region', { name })
}

function whoRides(section: 'Aller' | 'Retour') {
  return within(region(section)).getByRole('group', { name: /^Qui prend ce trajet \?/ })
}

describe('options des enfants', () => {
  it('règle la présence de son enfant depuis le panneau', async () => {
    const user = userEvent.setup()
    const store = planning()
    await renderRoute('/', { auth: parentOf('basile'), planning: store })
    await user.click(within(region('Présence')).getByRole('button', { name: 'Basile' }))
    await user.click(screen.getByRole('radio', { name: 'Absent du collège' }))
    expect(
      within(region('Présence')).getByRole('button', { name: 'Basile · absent' }),
    ).toHaveAttribute('aria-expanded', 'true')
    expect(within(region('Aller')).queryByText('Basile')).toBeNull()
    expect(store.writes()).toEqual([
      {
        kind: 'saveChildDay',
        key: '2026-09-30_basile',
        childDay: { date: WEDNESDAY, childId: 'basile', presence: 'absent', skipped: [] },
        authorUid: defaultUid,
      },
    ])
  })

  it("retire son enfant d'un seul trajet, puis l'y remet", async () => {
    const user = userEvent.setup()
    await renderRoute('/', { auth: parentOf('basile') })
    const group = whoRides('Aller')
    await user.click(within(group).getByRole('button', { name: 'Basile' }))
    expect(within(region('Aller')).getByText('Sans Basile sur ce trajet')).toBeInTheDocument()
    expect(within(group).getByRole('button', { name: 'Basile' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(within(region('Retour')).queryByText(/^Sans /)).toBeNull()
    await user.click(within(group).getByRole('button', { name: 'Basile' }))
    expect(within(region('Aller')).queryByText('Sans Basile sur ce trajet')).toBeNull()
  })

  it('met son enfant en permanence pour rejoindre un trajet plus tardif', async () => {
    const user = userEvent.setup()
    const store = planning()
    await renderRoute('/', { auth: parentOf('alice'), planning: store })
    await user.click(screen.getByRole('button', { name: /^jeudi 1/ }))
    const permanence = within(region('Retour')).getByRole('group', { name: 'Permanence 16:00' })
    await user.click(within(permanence).getByRole('button', { name: 'Alice' }))
    expect(within(permanence).getByRole('button', { name: 'Alice' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(region('Retour')).queryByText('14:55')).toBeNull()
    expect(store.writes().at(-1)).toMatchObject({
      kind: 'saveChildDay',
      key: '2026-10-01_alice',
      childDay: { permanence: '16:00' },
    })
  })

  it('retire du Retour un enfant en permanence : la permanence tombe, il apparaît retiré de son trajet habituel', async () => {
    const user = userEvent.setup()
    const store = planning({
      childDays: [
        childDay({ date: THURSDAY, childId: 'alice', permanence: '16:00', skipped: ['aller'] }),
      ],
    })
    await renderRoute('/', { auth: parentOf('alice'), planning: store })
    await user.click(screen.getByRole('button', { name: /^jeudi 1/ }))
    await user.click(within(whoRides('Retour')).getByRole('button', { name: 'Alice' }))
    expect(store.writes().at(-1)).toStrictEqual({
      kind: 'saveChildDay',
      key: '2026-10-01_alice',
      childDay: {
        date: THURSDAY,
        childId: 'alice',
        presence: 'present',
        skipped: ['aller', 'retour'],
      },
      authorUid: defaultUid,
    })
    const usual = within(region('Retour')).getByText('14:55').closest('li')
    expect(usual).toHaveTextContent('Sans Alice sur ce trajet')
    expect(within(region('Retour')).queryByRole('group', { name: 'Permanence 16:00' })).toBeNull()
  })

  it("rend le focus à la section Retour quand l'enfant quitte son trajet de permanence", async () => {
    const user = userEvent.setup()
    await renderRoute('/', {
      auth: parentOf('alice'),
      planning: planning({
        childDays: [childDay({ date: THURSDAY, childId: 'alice', permanence: '16:00' })],
      }),
    })
    await user.click(screen.getByRole('button', { name: /^jeudi 1/ }))
    await user.click(within(whoRides('Retour')).getByRole('button', { name: 'Alice' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Retour' })).toHaveFocus()
  })

  it('ne propose de réglage que pour ses propres enfants', async () => {
    await renderRoute('/', { auth: parentOf('alice') })
    expect(within(region('Présence')).queryByRole('button', { name: /^Basile/ })).toBeNull()
    expect(
      within(whoRides('Aller'))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Alice'])
  })

  it('laisse tout en affichage seul à un compte enfant', async () => {
    await renderRoute('/', { auth: member({ role: 'child', childId: 'basile', childIds: [] }) })
    expect(within(region('Présence')).queryByRole('button')).toBeNull()
    expect(screen.queryByRole('group', { name: /^Qui prend/ })).toBeNull()
  })

  it('fige les options sur un jour passé', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { auth: parentOf('basile') })
    await user.click(screen.getByRole('button', { name: /^lundi 28/ }))
    expect(within(region('Présence')).queryByRole('button')).toBeNull()
    expect(screen.queryByRole('group', { name: /^Qui prend/ })).toBeNull()
    expect(within(region('Retour')).queryByRole('button')).toBeNull()
  })

  it('annonce une journée qui ne peut plus être modifiée, et garde son état', async () => {
    const user = userEvent.setup()
    await renderRoute('/', {
      auth: parentOf('basile'),
      planning: planning({}, { writeOutcome: { status: 'refused' } }),
    })
    const group = whoRides('Aller')
    await user.click(within(group).getByRole('button', { name: 'Basile' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette journée ne peut plus être modifiée. Rechargez la page pour voir son état actuel.',
    )
    expect(within(group).getByRole('button', { name: 'Basile' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it("annonce l'échec d'une écriture rejetée", async () => {
    const user = userEvent.setup()
    await renderRoute('/', {
      auth: parentOf('basile'),
      planning: planning({}, { writeOutcome: 'reject' }),
    })
    await user.click(within(whoRides('Aller')).getByRole('button', { name: 'Basile' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/enregistrement impossible/i)
  })

  it('ferme le panneau de présence quand on change de jour', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { auth: parentOf('basile') })
    await user.click(within(region('Présence')).getByRole('button', { name: 'Basile' }))
    expect(screen.getByRole('radiogroup', { name: 'Présence de Basile' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^jeudi 1/ }))
    expect(screen.queryByRole('radiogroup')).toBeNull()
  })
})
