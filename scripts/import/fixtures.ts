/** A fresh week each call: `structuredClone` would keep a shared object shared. */
function week() {
  return {
    lundi: { debut: '08:25', fin: '16:00' },
    mardi: { debut: '08:25', fin: '17:00' },
    mercredi: { debut: '08:25', fin: '12:30' },
    jeudi: { debut: '09:25', fin: '17:00' },
    vendredi: { debut: '08:25', fin: '14:55' },
  }
}

/** A minimal valid import file with fictitious people. Each call returns a fresh copy. */
export function validImportFile() {
  return structuredClone({
    valableDu: '2026-09-01',
    busDuSoir: [
      { sortie: '16:00', arriveeCentreBourg: '16:55' },
      { sortie: '17:00', arriveeCentreBourg: '17:30' },
    ],
    enfants: {
      alice: {
        prenom: 'Alice',
        genre: 'female',
        couleur: 1,
        horaires: { semaine_A: week(), semaine_B: week() },
      },
      basile: {
        prenom: 'Basile',
        genre: 'male',
        couleur: 2,
        email: 'basile@exemple.fr',
        regime: 'DPS',
        autorisation_sortie: 'En fonction des cours assurés',
        horaires: { semaine_A: week(), semaine_B: week() },
      },
    },
    familles: [
      { enfants: ['alice'], parents: [{ email: 'camille@exemple.fr', prenom: 'Camille' }] },
      {
        enfants: ['basile'],
        parents: [
          { email: 'paul@exemple.fr', prenom: 'Paul' },
          { email: 'lea@exemple.fr', prenom: 'Léa' },
        ],
      },
    ],
  })
}
