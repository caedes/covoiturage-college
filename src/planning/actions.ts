import type { TripAction, TripStatus } from './types'

/**
 * The action offered on a trip. Nothing on a locked day or to someone who cannot drive. A driver
 * just replaced may take their trip back: « Je le prends » is offered to them as to anyone else.
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
      return 'takeOver'
    case 'void':
      return status.mine ? 'cancel' : null
  }
}

export type TakeDecision =
  | { kind: 'write'; replacedDriverUid: string | null }
  | { kind: 'conflict'; driverName: string }
  | { kind: 'already' }

/**
 * Decides a take inside the transaction, against the document as it is now. `expectedDriverUid`
 * is `null` for « Je prends » and the driver seen on screen for « Je le prends »: if someone else
 * got there first, the viewer is told who instead of overwriting them. When the document already
 * names `viewerUid` as its driver — a retried write, a second tab, a click replayed before
 * `onSnapshot` caught up — nothing needs writing, and no conflict is raised against the viewer's
 * own name.
 */
export function decideTake(
  existing: { driverUid: string; driverName: string } | null,
  expectedDriverUid: string | null,
  viewerUid: string,
): TakeDecision {
  if (existing !== null && existing.driverUid === viewerUid) {
    return { kind: 'already' }
  }
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
