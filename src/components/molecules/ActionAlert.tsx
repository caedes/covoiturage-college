import { Button } from '../atoms/ui/button'

type ActionAlertProps = { message: string; onDismiss: () => void }

/**
 * A write that did not go through, announced by `role="alert"` at the bottom of the screen. The
 * focus stays on the button the parent just pressed.
 */
export function ActionAlert({ message, onDismiss }: ActionAlertProps) {
  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-foreground px-4 py-3 text-sm text-background shadow-lg"
    >
      <p className="flex-1">{message}</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="text-background hover:bg-background/15 hover:text-background"
      >
        Fermer
      </Button>
    </div>
  )
}
