"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/Button/Button";

import styles from "./ConfirmDialog.module.scss";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // El foco inicial va en la opción segura (React no deja `autofocus` en un <dialog> que se abre después).
      dialog.querySelector<HTMLButtonElement>("[data-cancel]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
      onCancel={(event) => {
        // Esc: el estado lo gobierna el padre, que cierra el diálogo al cambiar `open`.
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="confirm-title" className={styles.title}>
        {title}
      </h2>
      <p id="confirm-body" className={styles.body}>
        {body}
      </p>
      <div className={styles.actions}>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy} data-cancel>
          Cancelar
        </Button>
      </div>
    </dialog>
  );
}
