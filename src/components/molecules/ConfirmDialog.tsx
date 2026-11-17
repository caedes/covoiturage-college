import type { ConfirmationText } from '../../lib/planningLabels'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../atoms/ui/alert-dialog'

type ConfirmDialogProps = {
  open: boolean
  text: ConfirmationText
  tone: 'default' | 'destructive'
  onConfirm: () => void
  onCancel: () => void
  /** Forwarded to Radix: lets the page send the focus elsewhere than the opening button. */
  onCloseAutoFocus?: (event: Event) => void
}

/**
 * Asks before an action that takes a trip away from someone. Each answer carries its own verb;
 * the focus opens on the one that changes nothing. Escape and a click on the backdrop mean "no".
 */
export function ConfirmDialog({
  open,
  text,
  tone,
  onConfirm,
  onCancel,
  onCloseAutoFocus,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        className="bg-card"
        onEscapeKeyDown={onCancel}
        onOverlayClick={onCancel}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{text.title}</AlertDialogTitle>
          <AlertDialogDescription>{text.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{text.cancel}</AlertDialogCancel>
          <AlertDialogAction variant={tone} onClick={onConfirm}>
            {text.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
