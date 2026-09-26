import {
  collection,
  getFirestore,
  onSnapshot,
  type QueryDocumentSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { toCarpool, toChildDay, toTimetable } from '../planning/documents'
import type { PlanningRepository, PlanningSnapshot } from '../planning/ports'
import { firebaseApp } from './app'

const database = getFirestore(firebaseApp)

function readAll<T>(documents: QueryDocumentSnapshot[], read: (data: unknown) => T | null): T[] {
  return documents.flatMap((document) => {
    const value = read(document.data())
    return value === null ? [] : [value]
  })
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
}
