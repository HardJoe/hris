'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', pending, onCancel, onConfirm }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelRef.current?.focus(), []);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <div className="modal-header"><h2 className="modal-title" id="confirm-title">{title}</h2><p className="modal-description" id="confirm-message">{message}</p></div>
        <div className="modal-body">
          <div className="modal-actions">
            <button ref={cancelRef} className="button button-secondary" type="button" onClick={onCancel} disabled={pending}>Cancel</button>
            <button className="button button-danger" type="button" onClick={onConfirm} disabled={pending}>{pending ? 'Deleting…' : confirmLabel}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
