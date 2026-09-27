import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DayChild, PlannedTrip } from '../../planning/types'
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
    expect(chip).toHaveAttribute('aria-controls', panel.id)
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
})

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
