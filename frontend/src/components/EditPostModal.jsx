import { useState } from 'react';
import { fetchAPI } from '../services/api';
import { notifyPostChange } from '../services/postEvents';
import Modal from './Modal';
import styles from './posts.module.css';

export default function EditPostModal({ post, onClose }) {
  const [content, setContent] = useState(post.content || '');
  const [privacy, setPrivacy] = useState(post.privacy);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!content.trim() && !post.media?.length) { setError('Bài viết không được để trống.'); return; }
    setBusy(true); setError('');
    try {
      const body = { content };
      if (privacy !== 'FRIENDS') body.privacy = privacy;
      const result = await fetchAPI('/posts/' + post.id, { method: 'PATCH', body: JSON.stringify(body) });
      notifyPostChange({ post: result.data });
      onClose();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <Modal title="Chỉnh sửa bài viết" onClose={onClose} busy={busy}>
    <form className={styles.editForm} onSubmit={submit}>
      <label htmlFor="edit-content">Nội dung</label>
      <textarea id="edit-content" maxLength={10000} value={content} disabled={busy} onChange={(event) => setContent(event.target.value)} />
      <label htmlFor="edit-privacy">Ai được xem?</label>
      <select id="edit-privacy" disabled={busy} value={privacy} onChange={(event) => setPrivacy(event.target.value)}>
        {post.privacy === 'FRIENDS' && <option value="FRIENDS">Giữ chế độ bạn bè (chỉ mình tôi)</option>}
        <option value="PUBLIC">Công khai</option><option value="PRIVATE">Chỉ mình tôi</option>
      </select>
      <p className={styles.hint}>Ảnh và tệp đính kèm được giữ nguyên.</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button className={styles.primary} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
    </form>
  </Modal>;
}
