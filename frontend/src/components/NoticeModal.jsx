import React from "react";
import styles from "./NoticeModal.module.css";

export default function NoticeModal({
  isOpen,
  type = "info", // "success" | "error" | "info"
  title,
  message,
  onClose,
  confirmText,
  cancelText,
  onCancel,
}) {
  if (!isOpen) return null;

  const hasButtons = Boolean(confirmText) || Boolean(cancelText);

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div
          className={`${styles.iconWrapper} ${
            type === "success"
              ? styles.iconSuccess
              : type === "error"
              ? styles.iconError
              : styles.iconInfo
          }`}
        >
          {type === "success" && (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          )}
          {type === "error" && (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          )}
          {type === "info" && (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          )}
        </div>

        {title && <h3 className={styles.title}>{title}</h3>}
        {message ? <p className={styles.message}>{message}</p> : null}

        {hasButtons && (
          <div className={styles.buttonGroup}>
            {cancelText && (
              <button
                type="button"
                className={styles.btnCancel}
                onClick={onCancel || onClose}
              >
                {cancelText}
              </button>
            )}
            {confirmText && (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={onClose}
                autoFocus
              >
                {confirmText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
