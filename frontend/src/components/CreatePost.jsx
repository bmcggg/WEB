import { useEffect, useRef, useState } from 'react';
import { fetchAPI } from '../services/api';
import styles from './posts.module.css';

function Preview({ file }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    Promise.resolve().then(() => setUrl(objectUrl));
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <img src={url || undefined} alt={file.name} />;
}

export default function CreatePost({ onCreated }) {
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState('PUBLIC');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const input = useRef(null);
  const chooseFiles = (event) => {
    const selected = [...files, ...event.target.files];
    event.target.value = '';
    setError('');
    if (selected.length > 5) { setError('Mỗi bài tối đa 5 tệp.'); return; }
    if (selected.some((file) => file.size > 10 * 1024 * 1024)) { setError('Mỗi tệp tối đa 10 MB.'); return; }
    if (selected.some((file) => !/\.(jpe?g|png|webp|pdf)$/i.test(file.name) || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type))) { setError('Chỉ hỗ trợ JPG, PNG, WEBP và PDF.'); return; }
    setFiles(selected);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError(''); setMessage('');
    if (!content.trim() && !files.length) { setError('Hãy nhập nội dung hoặc chọn ảnh/PDF.'); return; }
    setBusy(true);
    try {
      const body = new FormData();
      body.append('content', content);
      body.append('privacy', privacy);
      files.forEach((file) => body.append('media', file));
      const result = await fetchAPI('/posts', { method: 'POST', body });
      setContent(''); setFiles([]); setMessage('Đã đăng bài viết.');
      onCreated(result.data);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return (
    <form className={styles.composer} onSubmit={submit} aria-label="Tạo bài viết">
      <label htmlFor="post-content" className={styles.label}>Chia sẻ với mọi người</label>
      <textarea id="post-content" maxLength={10000} value={content} disabled={busy} onChange={(event) => setContent(event.target.value)} placeholder="Bạn đang nghĩ gì thế?" />
      <div className={styles.previews}>{files.map((file, index) => <div key={index} className={styles.preview}>
        {file.type.startsWith('image/') && <Preview file={file} />}<span>{file.name}</span>
        <button type="button" disabled={busy} onClick={() => setFiles((current) => current.filter((_, position) => position !== index))} aria-label={'Bỏ tệp ' + file.name}>Bỏ</button>
      </div>)}</div>
      <div className={styles.toolbar}>
        <input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple hidden onChange={chooseFiles} disabled={busy} />
        <button type="button" disabled={busy} onClick={() => input.current.click()}>Thêm ảnh / PDF</button>
        <label>Ai được xem? <select value={privacy} disabled={busy} onChange={(event) => setPrivacy(event.target.value)}><option value="PUBLIC">Công khai</option><option value="PRIVATE">Chỉ mình tôi</option></select></label>
        <button type="submit" disabled={busy} className={styles.primary}>{busy ? 'Đang đăng…' : 'Đăng bài'}</button>
      </div>
      <p className={styles.hint}>Tối đa 5 tệp · 10 MB/tệp · JPG, PNG, WEBP, PDF</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {message && <p role="status" className={styles.success}>{message}</p>}
    </form>
  );
}
