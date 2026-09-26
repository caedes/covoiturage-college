import type { Gender, IsoDate, Presence, TripStatus, Weekday, WeekRecap } from '../planning/types'

const SHORT: Record<Weekday, string> = {
  mon: 'Lun',
  tue: 'Mar',
  wed: 'Mer',
  thu: 'Jeu',
  fri: 'Ven',
}
const LONG: Record<Weekday, string> = {
  mon: 'lundi',
  tue: 'mardi',
  wed: 'mercredi',
  thu: 'jeudi',
  fri: 'vendredi',
}
const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' })

function month(date: IsoDate): string {
  return MONTH.format(new Date(`${date}T00:00:00Z`))
}

/** "28 septembre – 2 octobre", or "5 – 9 octobre" when the week fits in one month. */
export function weekRangeLabel(monday: IsoDate): string {
  const friday = new Date(`${monday}T00:00:00Z`)
  friday.setUTCDate(friday.getUTCDate() + 4)
  const fridayDate = friday.toISOString().slice(0, 10)
  const [start, end] = [dayNumber(monday), dayNumber(fridayDate)]
  return month(monday) === month(fridayDate)
    ? `${start} – ${end} ${month(fridayDate)}`
    : `${start} ${month(monday)} – ${end} ${month(fridayDate)}`
}

export function dayShortLabel(weekday: Weekday): string {
  return SHORT[weekday]
}

export function dayLongLabel(weekday: Weekday): string {
  return LONG[weekday]
}

export function dayNumber(date: IsoDate): number {
  return Number(date.slice(8, 10))
}

/** Accessible name of a day button: "mercredi 30", plus the coverage the green dot only shows. */
export function dayButtonLabel(weekday: Weekday, date: IsoDate, covered: boolean): string {
  const label = `${dayLongLabel(weekday)} ${dayNumber(date)}`
  return covered ? `${label}, tous les trajets sont couverts` : label
}

export function presenceLabel(firstName: string, gender: Gender, presence: Presence): string {
  if (presence === 'absent') {
    return `${firstName} · ${gender === 'female' ? 'absente' : 'absent'}`
  }
  return presence === 'sansCovoiturage' ? `${firstName} · sans covoiturage` : firstName
}

/** "Sans Alice et Basile sur ce trajet", or an empty string when nobody was taken off. */
export function skipNote(names: string[]): string {
  if (names.length === 0) {
    return ''
  }
  const listed =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
  return `Sans ${listed} sur ce trajet`
}

export function statusLabel(status: TripStatus): string {
  switch (status.kind) {
    case 'open':
      return "Personne pour l'instant"
    case 'mine':
      return 'Vous'
    case 'covered':
      return status.replacedYou ? `${status.driverName} a pris votre place` : status.driverName
    case 'void':
      if (status.mine) {
        return 'Personne à transporter · vous conduisez encore'
      }
      return status.driverName === null
        ? 'Personne à transporter'
        : `Personne à transporter · ${status.driverName} conduit encore`
  }
}

export function recapLabel(recap: WeekRecap, period: string): string {
  if (recap.total === 0) {
    return `Aucun trajet à couvrir ${period}`
  }
  const plural = recap.covered > 1
  return `${recap.covered} ${plural ? 'trajets' : 'trajet'} sur ${recap.total} ${plural ? 'couverts' : 'couvert'} ${period}`
}

export function recapPercent(recap: WeekRecap): number {
  return recap.total === 0 ? 100 : Math.round((recap.covered / recap.total) * 100)
}
