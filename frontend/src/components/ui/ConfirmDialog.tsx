"use client";

import { useState } from "react";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {cancelText}
        </Button>
        <Button
          variant={destructive ? "destructive" : "primary"}
          onClick={handle}
          disabled={busy}
        >
          {busy ? "Working…" : confirmText}
        </Button>
      </div>
    </Dialog>
  );
}
