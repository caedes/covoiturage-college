import type { Carpool, Trip, TripStatus } from './types'

export function resolveStatus(
  trip: Trip,
  carpool: Carpool | undefined,
  viewerUid: string,
): TripStatus {
  if (trip.riders.length === 0) {
    return {
      kind: 'void',
      driverName: carpool?.driverName ?? null,
      mine: carpool !== undefined && carpool.driverUid === viewerUid,
    }
  }
  if (carpool === undefined) {
    return { kind: 'open' }
  }
  if (carpool.driverUid === viewerUid) {
    return { kind: 'mine' }
  }
  return {
    kind: 'covered',
    driverName: carpool.driverName,
    replacedYou: carpool.replacedDriverUid === viewerUid,
  }
}
