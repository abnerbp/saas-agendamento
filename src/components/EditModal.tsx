import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import { Button } from './ui'

type EditModalProps = {
  open: boolean
  title: string
  description?: string
  saving?: boolean
  onClose: () => void
  children: ReactNode
}

export function EditModal({
  open,
  title,
  description,
  saving = false,
  onClose,
  children,
}: EditModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    if (!saving) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="edit-modal"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
    >
      <div className="edit-modal__surface">
        <header className="edit-modal__header">
          <div>
            <p className="edit-modal__eyebrow">Edição</p>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <Button
            variant="quiet"
            className="edit-modal__close"
            type="button"
            aria-label="Fechar edição"
            disabled={saving}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </Button>
        </header>
        <div className="edit-modal__body">{children}</div>
      </div>
    </dialog>
  )
}
