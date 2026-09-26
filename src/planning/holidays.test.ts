import { describe, expect, it } from 'vitest'
import { isHoliday, ZONE_A_2026_2027 } from './holidays'

describe('isHoliday', () => {
  it.each([
    ['2026-10-16', false, 'dernier jour de classe avant la Toussaint'],
    ['2026-10-19', true, 'lundi des vacances de la Toussaint'],
    ['2026-10-30', true, 'vendredi des vacances de la Toussaint'],
    ['2026-11-02', false, 'jour de reprise'],
    ['2026-11-11', true, 'armistice'],
    ['2026-12-21', true, 'vacances de Noël'],
    ['2027-01-04', false, 'reprise de janvier'],
    ['2027-02-15', true, "vacances d'hiver"],
    ['2027-03-01', false, "reprise après l'hiver"],
    ['2027-03-29', true, 'lundi de Pâques'],
    ['2027-04-12', true, 'vacances de printemps'],
    ['2027-04-26', false, 'reprise après le printemps'],
    ['2027-05-06', true, 'Ascension'],
    ['2027-05-07', true, "pont de l'Ascension"],
    ['2027-05-17', true, 'lundi de Pentecôte'],
    ['2027-07-02', false, "dernier jour avant l'été"],
    ['2027-07-05', true, "vacances d'été"],
    ['2026-09-28', false, 'jour de classe ordinaire'],
  ])('%s → %s (%s)', (date, expected) => {
    expect(isHoliday(ZONE_A_2026_2027, date)).toBe(expected)
  })
})
