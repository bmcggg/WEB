import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './posts.module.css';

export default function Modal({ title, onClose, children, busy = false }) {
  const dialog = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  const onKeyDown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); if (!busy) onClose(); }
    if (event.key === 'Tab') {
      const elements = [...dialog.current.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')];
      const first = elements[0];
      const last = elements.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    }
  };
  return createPortal(
    <div className={styles.backdrop} onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section ref={dialog} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={onKeyDown}>
        <header className={styles.modalHeader}><h2 id={titleId}>{title}</h2><button disabled={busy} onClick={onClose} aria-label="Đóng hộp thoại">×</button></header>
        {children}
      </section>
    </div>, document.body,
  );
}
