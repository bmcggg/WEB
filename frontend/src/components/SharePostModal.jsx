import { useRef, useState } from 'react';
import { api } from '../services/api';
import { notifyPostChange } from '../services/postEvents';
import Modal from './Modal';
import styles from './posts.module.css';

export default function SharePostModal({ post, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sending = useRef(false);

  const submit = async (event) => {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    const caption = new FormData(event.currentTarget).get('caption');
    setBusy(true);
    setError('');
    try {
      const result = await api.post('/posts/' + post.id + '/share', { caption });
      notifyPostChange({ createdId: result.postId });
      onClose();
    } catch (failure) {
      setError(failure.message);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  return <Modal title="Chia sẻ bài viết" onClose={onClose} busy={busy}>
    <p>Bài của {post.full_name || post.username} sẽ xuất hiện công khai trên bảng tin và trang cá nhân của bạn.</p>
    <form onSubmit={submit}>
      <label>
        Cảm nghĩ (không bắt buộc)
        <textarea name="caption" rows={4} maxLength={10000} disabled={busy} style={{ display: 'block', width: '100%' }} />
      </label>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.toolbar}>
        <button type="button" onClick={onClose} disabled={busy}>Hủy</button>
        <button type="submit" disabled={busy}>{busy ? 'Đang chia sẻ…' : 'Đăng chia sẻ'}</button>
      </div>
    </form>
  </Modal>;
}
