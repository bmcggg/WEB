import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAPI, readUser } from '../services/api';
import { notifyPostChange } from '../services/postEvents';
import PostCard from './PostCard';
import PostDetailModal from './PostDetailModal';
import EditPostModal from './EditPostModal';
import Modal from './Modal';
import styles from './posts.module.css';

export default function PostList({ endpoint, saved = false, emptyMessage = 'Chưa có bài viết nào.', onDeleted }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [modal, setModal] = useState(null);
  const [busyIds, setBusyIds] = useState([]);
  const [actionError, setActionError] = useState('');
  const locks = useRef(new Set());
  const currentUser = readUser();
  useEffect(() => {
    const controller = new AbortController();
    fetchAPI(endpoint + '?page=' + page + '&limit=10', { signal: controller.signal })
      .then((result) => {
        setPosts(result.data);
        setPagination(result.pagination);
        if (page > 1 && !result.data.length) setPage((value) => Math.max(1, value - 1));
      })
      .catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, page, revision]);

  useEffect(() => {
    const changed = ({ detail }) => {
      if (detail.deletedId) {
        setPosts((current) => current.filter((post) => post.id !== detail.deletedId));
        setModal((current) => current?.post.id === detail.deletedId ? null : current);
        setRevision((value) => value + 1);
      } else if (detail.post) {
        setPosts((current) => current.map((post) => post.id === detail.post.id ? { ...post, ...detail.post } : post)
          .filter((post) => !saved || post.is_saved));
        setModal((current) => current?.post.id === detail.post.id ? { ...current, post: { ...current.post, ...detail.post } } : current);
        if (saved) setRevision((value) => value + 1);
      }
    };
    window.addEventListener('fella:post-change', changed);
    return () => window.removeEventListener('fella:post-change', changed);
  }, [saved]);

  const act = async (post, operation) => {
    if (locks.current.has(post.id)) return;
    locks.current.add(post.id);
    setBusyIds([...locks.current]); setActionError('');
    try { await operation(); }
    catch (failure) { setActionError(failure.message); }
    finally { locks.current.delete(post.id); setBusyIds([...locks.current]); }
  };
  const save = (post) => act(post, async () => {
    const result = await fetchAPI('/posts/' + post.id + '/save', { method: post.is_saved ? 'DELETE' : 'POST' });
    notifyPostChange({ post: { id: post.id, is_saved: result.is_saved } });
  });
  const remove = (post) => act(post, async () => {
    await fetchAPI('/posts/' + post.id, { method: 'DELETE' });
    notifyPostChange({ deletedId: post.id });
    onDeleted?.(post);
    setModal(null);
  });
  const close = useCallback(() => { setModal(null); setActionError(''); }, []);
  const changePage = (value) => { setPage(value); setLoading(true); setError(''); };
  const cardProps = { currentUser, onSaveToggle: save, onEdit: (post) => { setActionError(''); setModal({ type: 'edit', post }); }, onDelete: (post) => { setActionError(''); setModal({ type: 'delete', post }); } };

  return <section className={styles.list} aria-label={saved ? 'Bài viết đã lưu' : 'Danh sách bài viết'}>
    {actionError && !modal && <p role="alert" className={styles.error}>{actionError}</p>}
    {loading ? <p role="status" className={styles.status}>Đang tải bài viết…</p>
      : error ? <div role="alert" className={styles.error}>{error} <button onClick={() => { setError(''); setLoading(true); setRevision((value) => value + 1); }}>Thử lại</button></div>
        : posts.length ? posts.map((post) => <PostCard key={post.id} post={post} {...cardProps} busy={busyIds.includes(post.id)} onOpenDetail={(selected) => setModal({ type: 'detail', post: selected })} />)
          : <p className={styles.status}>{emptyMessage}</p>}
    {pagination && pagination.totalPages > 1 && <nav className={styles.pagination} aria-label="Phân trang bài viết">
      <button disabled={loading || page === 1} onClick={() => changePage(page - 1)}>Trang trước</button>
      <span>Trang {page} / {pagination.totalPages}</span>
      <button disabled={loading || page >= pagination.totalPages} onClick={() => changePage(page + 1)}>Trang sau</button>
    </nav>}
    {modal?.type === 'detail' && <PostDetailModal key={modal.post.id} postId={modal.post.id} onClose={close} {...cardProps} busy={busyIds.includes(modal.post.id)} actionError={actionError} />}
    {modal?.type === 'edit' && <EditPostModal key={modal.post.id} post={modal.post} onClose={close} />}
    {modal?.type === 'delete' && <Modal title="Xóa bài viết?" onClose={close} busy={busyIds.includes(modal.post.id)}>
      <p>Bài viết, tệp đính kèm và các tương tác liên quan sẽ bị xóa. Thao tác này không thể hoàn tác.</p>
      {actionError && <p role="alert" className={styles.error}>{actionError}</p>}
      <div className={styles.toolbar}><button disabled={busyIds.includes(modal.post.id)} onClick={close}>Hủy</button><button className={styles.danger} disabled={busyIds.includes(modal.post.id)} onClick={() => remove(modal.post)}>{busyIds.includes(modal.post.id) ? 'Đang xóa…' : 'Xác nhận xóa'}</button></div>
    </Modal>}
  </section>;
}
