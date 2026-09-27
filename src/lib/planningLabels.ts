import type { WriteOutcome } from '../planning/ports'
import type {
  Gender,
  IsoDate,
  Presence,
  TripAction,
  TripStatus,
  Weekday,
  WeekRecap,
} from '../planning/types'

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

const PRESENCE_OPTION: Record<Presence, Record<Gender, string>> = {
  present: { female: 'Présente · covoiturage normal', male: 'Présent · covoiturage normal' },
  absent: { female: 'Absente du collège', male: 'Absent du collège' },
  sansCovoiturage: {
    female: 'Au collège, mais sans covoiturage',
    male: 'Au collège, mais sans covoiturage',
  },
}

/** One choice of the presence panel, in the prototype's words. */
export function presenceOptionLabel(gender: Gender, presence: Presence): string {
  return PRESENCE_OPTION[presence][gender]
}

/** "Présence de Basile", "Présence d'Alice": elided before a vowel. */
export function presencePanelLabel(firstName: string): string {
  return /^[aeiouyàâéèêëîïôœ]/i.test(firstName)
    ? `Présence d'${firstName}`
    : `Présence de ${firstName}`
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

const ACTION: Record<TripAction, string> = {
  take: 'Je prends',
  takeOver: 'Je le prends',
  cancel: 'Annuler',
}

export function actionLabel(action: TripAction): string {
  return ACTION[action]
}

/** "trajet de 07:40, Maison → Centre-bourg": what distinguishes one trip from another. */
export function tripDescription(time: string, label: string): string {
  return `trajet de ${time}, ${label}`
}

/** Starts with the visible label, so that voice control users can say what they see. */
export function actionAccessibleLabel(action: TripAction, time: string, label: string): string {
  return `${ACTION[action]} — ${tripDescription(time, label)}`
}

export function writeFailureMessage(outcome: Exclude<WriteOutcome, { status: 'done' }>): string {
  switch (outcome.status) {
    case 'alreadyTaken':
      return `${outcome.driverName} a pris ce trajet juste avant vous.`
    case 'refused':
      return 'Ce trajet ne peut plus être modifié. Rechargez la page pour voir son état actuel.'
    case 'failed':
      return 'Enregistrement impossible. Vérifiez votre connexion internet, puis réessayez.'
  }
}

/** A presence, a trip left out or a permanence that did not go through. */
export function childDayFailureMessage(outcome: Exclude<WriteOutcome, { status: 'done' }>): string {
  return outcome.status === 'refused'
    ? 'Cette journée ne peut plus être modifiée. Rechargez la page pour voir son état actuel.'
    : 'Enregistrement impossible. Vérifiez votre connexion internet, puis réessayez.'
}

const SUCCESS_VERB: Record<TripAction, string> = {
  take: 'prenez',
  takeOver: 'reprenez',
  cancel: 'avez annulé',
}

/** Confirms a successful write to screen readers, who saw no visible change worth announcing. */
export function writeSuccessMessage(action: TripAction, time: string, label: string): string {
  return `Vous ${SUCCESS_VERB[action]} le trajet de ${time}, ${label}.`
}
