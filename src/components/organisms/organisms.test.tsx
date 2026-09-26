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
  { childId: 'alice', firstName: 'Alice', gender: 'female', colorSlot: 1, presence: 'present' },
  { childId: 'basile', firstName: 'Basile', gender: 'male', colorSlot: 2, presence: 'absent' },
  { childId: 'chloe', firstName: 'Chloé', gender: 'female', colorSlot: 3, presence: 'present' },
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
})
