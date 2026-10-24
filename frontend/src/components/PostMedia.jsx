import { useEffect, useState } from 'react';
import { fetchAPI } from '../services/api';
import { acquireMedia } from '../services/media';
import styles from './PostCard.module.css';

export default function PostMedia({ media }) {
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (media.media_type !== 'IMAGE') return;
    let active = true;
    const resource = acquireMedia(media.media_url);
    resource.promise.then((url) => { if (active) setSource(url); })
      .catch((failure) => { if (active && failure.name !== 'AbortError') setError(failure.message); });
    return () => { active = false; resource.release(); };
  }, [media.media_url, media.media_type, attempt]);

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const blob = await fetchAPI(media.media_url, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'tai-lieu-' + media.id + '.pdf';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };

  if (media.media_type !== 'IMAGE') return <div className={styles.file}><button disabled={busy} onClick={download}>{busy ? 'Đang tải…' : 'Tải tài liệu PDF #' + media.id}</button>{error && <p role="alert">{error}</p>}</div>;
  if (error) return <div role="alert" className={styles.file}>{error} <button onClick={() => { setError(''); setSource(''); setAttempt((value) => value + 1); }}>Thử lại ảnh</button></div>;
  return source ? <img className={styles.mediaImage} src={source} alt={'Ảnh đính kèm ' + (media.display_order + 1)} /> : <div className={styles.mediaPlaceholder} role="status">Đang tải ảnh…</div>;
}
