import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  type QueryDocumentSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { decideCancel, decideTake } from '../planning/actions'
import { toCarpool, toChildDay, toTimetable } from '../planning/documents'
import type {
  CarpoolRef,
  Driver,
  PlanningRepository,
  PlanningSnapshot,
  WriteOutcome,
} from '../planning/ports'
import { carpoolKey } from '../planning/trips'
import { firebaseApp } from './app'

const database = getFirestore(firebaseApp)

function readAll<T>(documents: QueryDocumentSnapshot[], read: (data: unknown) => T | null): T[] {
  return documents.flatMap((document) => {
    const value = read(document.data())
    return value === null ? [] : [value]
  })
}

function carpoolDocument(ref: CarpoolRef) {
  return doc(database, 'carpools', carpoolKey(ref.date, ref.direction, ref.place, ref.time))
}

/**
 * « Je prends » and « Je le prends » in one transaction: the decision is taken against the
 * document as it is at commit time, so two parents clicking together never overwrite each other.
 */
async function drive(
  ref: CarpoolRef,
  driver: Driver,
  expectedDriverUid: string | null,
): Promise<WriteOutcome> {
  try {
    return await runTransaction(database, async (transaction): Promise<WriteOutcome> => {
      const reference = carpoolDocument(ref)
      const snapshot = await transaction.get(reference)
      const existing = snapshot.exists() ? toCarpool(snapshot.data()) : null
      const decision = decideTake(existing, expectedDriverUid)
      if (decision.kind === 'conflict') {
        return { status: 'alreadyTaken', driverName: decision.driverName }
      }
      transaction.set(reference, {
        date: ref.date,
        direction: ref.direction,
        place: ref.place,
        time: ref.time,
        driverUid: driver.uid,
        driverName: driver.firstName,
        ...(decision.replacedDriverUid === null
          ? {}
          : { replacedDriverUid: decision.replacedDriverUid }),
        updatedAt: serverTimestamp(),
      })
      return { status: 'done' }
    })
  } catch (error) {
    console.error('Enregistrement du trajet impossible', error)
    return { status: 'failed' }
  }
}

export const firebasePlanningRepository: PlanningRepository = {
  subscribe(range, listener, onError) {
    const current: Partial<PlanningSnapshot> = {}
    let failed = false
    const emit = () => {
      if (failed) {
        return
      }
      const { timetables, carpools, childDays } = current
      if (timetables !== undefined && carpools !== undefined && childDays !== undefined) {
        listener({ timetables, carpools, childDays })
      }
    }
    const inRange = (name: string) =>
      query(
        collection(database, name),
        where('date', '>=', range.from),
        where('date', '<=', range.to),
      )
    const fail = (error: unknown) => {
      console.error('Lecture du planning impossible', error)
      failed = true
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
      onError()
    }

    const unsubscribers = [
      onSnapshot(
        collection(database, 'timetables'),
        (snapshot) => {
          current.timetables = readAll(snapshot.docs, toTimetable)
          emit()
        },
        fail,
      ),
      onSnapshot(
        inRange('carpools'),
        (snapshot) => {
          current.carpools = readAll(snapshot.docs, toCarpool)
          emit()
        },
        fail,
      ),
      onSnapshot(
        inRange('childDays'),
        (snapshot) => {
          current.childDays = readAll(snapshot.docs, toChildDay)
          emit()
        },
        fail,
      ),
    ]
    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
    }
  },

  take(ref, driver) {
    return drive(ref, driver, null)
  },

  takeOver(ref, driver, currentDriverUid) {
    return drive(ref, driver, currentDriverUid)
  },

  async cancel(ref, driver) {
    try {
      return await runTransaction(database, async (transaction) => {
        const reference = carpoolDocument(ref)
        const snapshot = await transaction.get(reference)
        const existing = snapshot.exists() ? toCarpool(snapshot.data()) : null
        if (decideCancel(existing, driver.uid) === 'delete') {
          transaction.delete(reference)
        }
        return { status: 'done' }
      })
    } catch (error) {
      console.error('Annulation du trajet impossible', error)
      return { status: 'failed' }
    }
  },
}
