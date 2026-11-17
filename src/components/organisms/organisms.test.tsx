import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DayChild, DayHours, PlannedTrip } from '../../planning/types'
import { BELL_TIMES } from '../../test/planningFixtures'
import { Tabs } from '../atoms/ui/tabs'
import { DaySelector } from './DaySelector'
import { PresenceBar } from './PresenceBar'
import { TripCard } from './TripCard'
import { TripSection } from './TripSection'
import { WeeklyRecap } from './WeeklyRecap'
import { WeekTabs } from './WeekTabs'

const ROSTER: DayChild[] = [
  {
    childId: 'alice',
    firstName: 'Alice',
    gender: 'female',
    colorSlot: 1,
    presence: 'present',
    editable: false,
  },
  {
    childId: 'basile',
    firstName: 'Basile',
    gender: 'male',
    colorSlot: 2,
    presence: 'absent',
    editable: false,
  },
  {
    childId: 'chloe',
    firstName: 'Chloé',
    gender: 'female',
    colorSlot: 3,
    presence: 'present',
    editable: false,
  },
]

const BUS: PlannedTrip = {
  key: '2026-09-28_retour_centre-bourg_1745',
  date: '2026-09-28',
  direction: 'retour',
  place: 'centre-bourg',
  mode: 'bus',
  time: '17:45',
  label: 'Centre-bourg → Maison',
  riders: ['alice'],
  excluded: [{ childId: 'chloe', reason: 'skipped' }],
  status: { kind: 'open' },
  offers: [
    {
      childId: 'chloe',
      exitTime: '17:00',
      tripKey: '2026-09-28_retour_centre-bourg_1745',
      active: true,
    },
  ],
  action: 'take',
}

/** The same children, the viewer being the parent of those listed. */
function rosterOf(...editable: string[]): DayChild[] {
  return ROSTER.map((child) => ({ ...child, editable: editable.includes(child.childId) }))
}

describe('WeekTabs', () => {
  it('propose les deux semaines en onglets, avec la période', () => {
    render(
      <Tabs value="current">
        <WeekTabs range="28 septembre – 2 octobre" />
      </Tabs>,
    )
    expect(screen.getByRole('tab', { name: 'Cette semaine' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Semaine prochaine' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.getByText('28 septembre – 2 octobre')).toBeInTheDocument()
  })

  it('donne à l’onglet inactif une couleur de texte assez contrastée', () => {
    render(
      <Tabs value="current">
        <WeekTabs range="28 septembre – 2 octobre" />
      </Tabs>,
    )
    expect(screen.getByRole('tab', { name: 'Semaine prochaine' })).toHaveClass(
      'data-[state=inactive]:text-secondary-foreground',
    )
  })
})

describe('DaySelector', () => {
  it('rend les jours dans un groupe nommé et signale le jour choisi', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <DaySelector
        days={[
          { date: '2026-09-28', weekday: 'mon', covered: true },
          { date: '2026-09-29', weekday: 'tue', covered: false },
        ]}
        selected="2026-09-29"
        onSelect={onSelect}
      />,
    )
    const group = screen.getByRole('group', { name: 'Jours de la semaine' })
    expect(within(group).getByRole('button', { name: 'mardi 29' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(
      within(group).getByRole('button', { name: 'lundi 28, tous les trajets sont couverts' }),
    )
    expect(onSelect).toHaveBeenCalledWith('2026-09-28')
  })
})

describe('PresenceBar', () => {
  it('annonce la présence de chaque enfant sous un titre de niveau 2', () => {
    render(<PresenceBar roster={ROSTER} />)
    const section = screen.getByRole('region', { name: 'Présence' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Présence' })).toBeInTheDocument()
    expect(within(section).getByText('Alice')).toBeInTheDocument()
    expect(within(section).getByText('Basile · absent')).toHaveAttribute('data-active', 'false')
  })

  it('ouvre le panneau de présence de son enfant et enregistre le choix', async () => {
    const user = userEvent.setup()
    const onPresenceChange = vi.fn()
    render(<PresenceBar roster={rosterOf('basile')} onPresenceChange={onPresenceChange} />)
    const chip = screen.getByRole('button', { name: 'Basile · absent' })
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-expanded', 'true')
    const panel = screen.getByRole('radiogroup', { name: 'Présence de Basile' })
    const controlled = document.getElementById(chip.getAttribute('aria-controls') ?? '')
    expect(controlled).toContainElement(panel)
    expect(within(panel).getByRole('radio', { name: 'Absent du collège' })).toBeChecked()
    await user.click(
      within(panel).getByRole('radio', { name: 'Au collège, mais sans covoiturage' }),
    )
    expect(onPresenceChange).toHaveBeenCalledWith('basile', 'sansCovoiturage')
  })

  it('ferme le panneau avec Échap et rend le focus à la puce', async () => {
    const user = userEvent.setup()
    render(<PresenceBar roster={rosterOf('basile')} onPresenceChange={vi.fn()} />)
    const chip = screen.getByRole('button', { name: 'Basile · absent' })
    await user.click(chip)
    await user.click(screen.getByRole('radio', { name: 'Absent du collège' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(chip).toHaveFocus()
    expect(chip).toHaveAttribute('aria-expanded', 'false')
  })

  it("laisse en affichage seul la présence des enfants d'une autre famille", () => {
    render(<PresenceBar roster={ROSTER} onPresenceChange={vi.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('propose les horaires modifiés en deuxième choix, sans rien enregistrer avant une heure', async () => {
    const user = userEvent.setup()
    const onPresenceChange = vi.fn()
    const onHoursChange = vi.fn()
    render(
      <PresenceBar
        roster={withAliceHours({})}
        onPresenceChange={onPresenceChange}
        onHoursChange={onHoursChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Alice' }))
    const panel = screen.getByRole('radiogroup', { name: "Présence d'Alice" })
    expect(within(panel).getAllByRole('radio').map(labelOf)).toEqual([
      'Présente · covoiturage normal',
      'Présente · horaires modifiés',
      'Absente du collège',
      'Au collège, mais sans covoiturage',
    ])
    expect(screen.queryByRole('radiogroup', { name: "Heure d'entrée d'Alice" })).toBeNull()
    await user.click(within(panel).getByRole('radio', { name: 'Présente · horaires modifiés' }))
    expect(onPresenceChange).not.toHaveBeenCalled()
    expect(onHoursChange).not.toHaveBeenCalled()
    expect(screen.getByRole('radiogroup', { name: "Heure d'entrée d'Alice" })).toBeInTheDocument()
    const exit = screen.getByRole('radiogroup', { name: "Heure de sortie d'Alice" })
    expect(within(exit).getByRole('radio', { name: '16:00' })).toBeChecked()
    await user.click(within(exit).getByRole('radio', { name: '12:30' }))
    expect(onHoursChange).toHaveBeenCalledWith('alice', { end: '12:30' })
    expect(onPresenceChange).not.toHaveBeenCalled()
  })

  it('revient au covoiturage normal sans rien écrire quand aucune heure n’a été touchée', async () => {
    const user = userEvent.setup()
    const onPresenceChange = vi.fn()
    render(
      <PresenceBar
        roster={withAliceHours({})}
        onPresenceChange={onPresenceChange}
        onHoursChange={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Alice' }))
    await user.click(screen.getByRole('radio', { name: 'Présente · horaires modifiés' }))
    await user.click(screen.getByRole('radio', { name: 'Présente · covoiturage normal' }))
    expect(onPresenceChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('radiogroup', { name: "Heure d'entrée d'Alice" })).toBeNull()
    expect(screen.getByRole('radio', { name: 'Présente · covoiturage normal' })).toBeChecked()
  })

  it("affiche l'horaire modifié sur la pastille et ouvre le panneau sur les horaires modifiés", async () => {
    const user = userEvent.setup()
    const onPresenceChange = vi.fn()
    render(
      <PresenceBar
        roster={withAliceHours({ end: '12:30', effect: { aller: null, retour: '12:30' } })}
        onPresenceChange={onPresenceChange}
        onHoursChange={vi.fn()}
      />,
    )
    const chip = screen.getByRole('button', { name: 'Alice · 08:25 – 12:30' })
    expect(chip).toHaveAttribute('data-active', 'true')
    await user.click(chip)
    expect(screen.getByRole('radio', { name: 'Présente · horaires modifiés' })).toBeChecked()
    const exit = screen.getByRole('radiogroup', { name: "Heure de sortie d'Alice" })
    expect(within(exit).getByRole('radio', { name: '12:30' })).toBeChecked()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Retour 12:30 au collège : il faudra un conducteur.',
    )
    await user.click(screen.getByRole('radio', { name: 'Présente · covoiturage normal' }))
    expect(onPresenceChange).toHaveBeenCalledWith('alice', 'present')
  })

  it("n'affiche pas de message quand le changement ne crée aucun trajet", async () => {
    const user = userEvent.setup()
    render(
      <PresenceBar
        roster={withAliceHours({ end: '17:00' })}
        onPresenceChange={vi.fn()}
        onHoursChange={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Alice · 08:25 – 17:00' }))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('ferme le panneau avec Échap depuis une heure', async () => {
    const user = userEvent.setup()
    render(
      <PresenceBar
        roster={withAliceHours({ end: '12:30' })}
        onPresenceChange={vi.fn()}
        onHoursChange={vi.fn()}
      />,
    )
    const chip = screen.getByRole('button', { name: 'Alice · 08:25 – 12:30' })
    await user.click(chip)
    await user.click(screen.getByRole('radio', { name: '12:30' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(chip).toHaveFocus()
  })

  it('ouvre les horaires modifiés depuis un enfant absent', async () => {
    const user = userEvent.setup()
    const onPresenceChange = vi.fn()
    const onHoursChange = vi.fn()
    const roster = withAliceHours({}).map((child) =>
      child.childId === 'alice' ? { ...child, presence: 'absent' as const } : child,
    )
    render(
      <PresenceBar
        roster={roster}
        onPresenceChange={onPresenceChange}
        onHoursChange={onHoursChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Alice · absente' }))
    await user.click(screen.getByRole('radio', { name: 'Présente · horaires modifiés' }))
    expect(screen.getByRole('radio', { name: 'Présente · horaires modifiés' })).toBeChecked()
    expect(onPresenceChange).not.toHaveBeenCalled()
    expect(onHoursChange).not.toHaveBeenCalled()
    const exit = screen.getByRole('radiogroup', { name: "Heure de sortie d'Alice" })
    await user.click(within(exit).getByRole('radio', { name: '12:30' }))
    expect(onHoursChange).toHaveBeenCalledWith('alice', { end: '12:30' })
    expect(onPresenceChange).not.toHaveBeenCalled()
  })

  it('grise les heures impossibles sur une journée 08:25 – 12:30', async () => {
    const user = userEvent.setup()
    const morning = { start: '08:25', end: '12:30' }
    render(
      <PresenceBar
        roster={withAliceHours({ usual: morning, ...morning })}
        onPresenceChange={vi.fn()}
        onHoursChange={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Alice' }))
    await user.click(screen.getByRole('radio', { name: 'Présente · horaires modifiés' }))
    const entry = screen.getByRole('radiogroup', { name: "Heure d'entrée d'Alice" })
    for (const time of ['13:00', '14:00', '15:00', '16:05']) {
      expect(within(entry).getByRole('radio', { name: time })).toBeDisabled()
    }
    for (const time of ['08:25', '09:25', '10:35', '11:35']) {
      expect(within(entry).getByRole('radio', { name: time })).toBeEnabled()
    }
    const exit = screen.getByRole('radiogroup', { name: "Heure de sortie d'Alice" })
    expect(within(exit).getByRole('radio', { name: '09:20' })).toBeEnabled()
  })

  it("grise les sorties qui ne suivent pas l'entrée modifiée", async () => {
    const user = userEvent.setup()
    render(
      <PresenceBar
        roster={withAliceHours({ start: '10:35', effect: { aller: '10:35', retour: null } })}
        onPresenceChange={vi.fn()}
        onHoursChange={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Alice · 10:35 – 16:00' }))
    const exit = screen.getByRole('radiogroup', { name: "Heure de sortie d'Alice" })
    expect(within(exit).getByRole('radio', { name: '09:20' })).toBeDisabled()
    expect(within(exit).getByRole('radio', { name: '10:20' })).toBeDisabled()
    expect(within(exit).getByRole('radio', { name: '11:30' })).toBeEnabled()
  })

  it('garde ses trois choix pour un enfant sans horaires connus', async () => {
    const user = userEvent.setup()
    render(
      <PresenceBar roster={rosterOf('alice')} onPresenceChange={vi.fn()} onHoursChange={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.queryByRole('radio', { name: 'Présente · horaires modifiés' })).toBeNull()
  })
})

/** The accessible name of a Radix radio, given by its `<label for>`. */
function labelOf(radio: HTMLElement): string | null {
  return document.querySelector(`label[for="${radio.id}"]`)?.textContent ?? null
}

/** Alice, editable, with a 08:25 – 16:00 day and the given effective hours. */
function withAliceHours(hours: Partial<DayHours>): DayChild[] {
  return rosterOf('alice').map((child) =>
    child.childId === 'alice'
      ? {
          ...child,
          hours: {
            usual: { start: '08:25', end: '16:00' },
            start: '08:25',
            end: '16:00',
            bellTimes: BELL_TIMES,
            effect: { aller: null, retour: null },
            ...hours,
          },
        }
      : child,
  )
}

describe('TripCard', () => {
  it("rend l'heure, le libellé, les passagers, les retraits et le statut", () => {
    render(<TripCard trip={BUS} roster={ROSTER} />)
    expect(screen.getByText('17:45')).toBeInTheDocument()
    expect(screen.getByText('Centre-bourg → Maison')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toHaveClass('sr-only')
    expect(screen.getByText('Sans Chloé sur ce trajet')).toBeInTheDocument()
    expect(screen.getByText("Personne pour l'instant")).toBeInTheDocument()
  })

  it('met en pointillés un trajet sans passager', () => {
    const { container } = render(
      <TripCard
        trip={{
          ...BUS,
          riders: [],
          excluded: [],
          status: { kind: 'void', driverName: null, mine: false },
        }}
        roster={ROSTER}
      />,
    )
    expect(container.firstElementChild).toHaveClass('border-dashed')
  })

  it("transmet l'action du trajet et signale celle en cours", async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    const { rerender } = render(
      <TripCard trip={BUS} roster={ROSTER} onAction={onAction} pendingKeys={new Set()} />,
    )
    await user.click(screen.getByRole('button', { name: /^Je prends — trajet de 17:45/ }))
    expect(onAction).toHaveBeenCalledWith(BUS)
    rerender(
      <TripCard trip={BUS} roster={ROSTER} onAction={onAction} pendingKeys={new Set([BUS.key])} />,
    )
    expect(screen.getByRole('button', { name: /^Je prends/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it("n'affiche aucun bouton sans gestionnaire d'action", () => {
    render(<TripCard trip={BUS} roster={ROSTER} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('propose « Qui prend ce trajet ? » pour ses enfants, pressés quand ils y sont', async () => {
    const user = userEvent.setup()
    const onToggleRider = vi.fn()
    render(
      <TripCard trip={BUS} roster={rosterOf('alice', 'chloe')} onToggleRider={onToggleRider} />,
    )
    const group = screen.getByRole('group', {
      name: 'Qui prend ce trajet ? — trajet de 17:45, Centre-bourg → Maison',
    })
    expect(within(group).getByRole('button', { name: 'Alice' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(group).getByRole('button', { name: 'Chloé' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await user.click(within(group).getByRole('button', { name: 'Chloé' }))
    expect(onToggleRider).toHaveBeenCalledWith(BUS, 'chloe')
  })

  it("n'affiche pas « Qui prend ce trajet ? » sans enfant à régler", () => {
    render(<TripCard trip={BUS} roster={rosterOf('basile')} onToggleRider={vi.fn()} />)
    expect(screen.queryByRole('group')).toBeNull()
  })
})

describe('TripSection', () => {
  it('liste les trajets sous un titre, avec la permanence au-dessus du trajet visé', () => {
    render(<TripSection title="Retour" trips={[BUS]} roster={ROSTER} />)
    const section = screen.getByRole('region', { name: 'Retour' })
    const [item] = within(section).getAllByRole('listitem')
    expect(item).toHaveTextContent(/Permanence 17:00.*Chloé.*17:45/)
    expect(within(section).getByText('Chloé', { selector: '[data-active]' })).toHaveAttribute(
      'data-active',
      'true',
    )
  })

  it('dit quand il n’y a aucun trajet', () => {
    render(<TripSection title="Aller" trips={[]} roster={ROSTER} />)
    expect(screen.getByText('Aucun trajet')).toBeInTheDocument()
  })

  it('rend la permanence réglable pour ses enfants', async () => {
    const user = userEvent.setup()
    const onTogglePermanence = vi.fn()
    render(
      <TripSection
        title="Retour"
        trips={[BUS]}
        roster={rosterOf('chloe')}
        onTogglePermanence={onTogglePermanence}
      />,
    )
    const group = screen.getByRole('group', { name: 'Permanence 17:00' })
    const chip = within(group).getByRole('button', { name: 'Chloé' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await user.click(chip)
    expect(onTogglePermanence).toHaveBeenCalledWith(BUS.offers[0])
  })

  it("laisse la permanence en affichage seul pour les enfants d'une autre famille", () => {
    render(
      <TripSection title="Retour" trips={[BUS]} roster={ROSTER} onTogglePermanence={vi.fn()} />,
    )
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('WeeklyRecap', () => {
  it('rend le récapitulatif et une barre de progression nommée', () => {
    render(<WeeklyRecap recap={{ covered: 4, total: 15 }} period="la semaine prochaine" />)
    expect(screen.getByText('4 trajets sur 15 couverts la semaine prochaine')).toBeInTheDocument()
    expect(screen.getByText('27 %')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: 'Part des trajets couverts' }),
    ).toBeInTheDocument()
  })

  it("ne montre ni pourcentage ni barre quand il n'y a rien à couvrir", () => {
    render(<WeeklyRecap recap={{ covered: 0, total: 0 }} period="cette semaine" />)
    expect(screen.getByText('Aucun trajet à couvrir cette semaine')).toBeInTheDocument()
    expect(screen.queryByText('100 %')).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })
})
