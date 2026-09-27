import type { TripAction, TripStatus } from './types'

/**
 * The action offered on a trip. Nothing on a locked day or to someone who cannot drive; nothing to
 * a driver just replaced, who sees « X a pris votre place » instead.
 */
export function tripAction(status: TripStatus, editable: boolean): TripAction | null {
  if (!editable) {
    return null
  }
  switch (status.kind) {
    case 'open':
      return 'take'
    case 'mine':
      return 'cancel'
    case 'covered':
      return status.replacedYou ? null : 'takeOver'
    case 'void':
      return status.mine ? 'cancel' : null
  }
}

export type TakeDecision =
  | { kind: 'write'; replacedDriverUid: string | null }
  | { kind: 'conflict'; driverName: string }

/**
 * Decides a take inside the transaction, against the document as it is now. `expectedDriverUid`
 * is `null` for « Je prends » and the driver seen on screen for « Je le prends »: if someone else
 * got there first, the viewer is told who instead of overwriting them.
 */
export function decideTake(
  existing: { driverUid: string; driverName: string } | null,
  expectedDriverUid: string | null,
): TakeDecision {
  if (existing === null) {
    return { kind: 'write', replacedDriverUid: null }
  }
  if (expectedDriverUid !== null && existing.driverUid === expectedDriverUid) {
    return { kind: 'write', replacedDriverUid: expectedDriverUid }
  }
  return { kind: 'conflict', driverName: existing.driverName }
}

/** Cancelling only deletes a carpool the viewer still drives: otherwise there is nothing to undo. */
export function decideCancel(
  existing: { driverUid: string } | null,
  driverUid: string,
): 'delete' | 'nothing' {
  return existing !== null && existing.driverUid === driverUid ? 'delete' : 'nothing'
}
