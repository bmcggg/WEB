import { useEffect, useState } from 'react';
import { fetchAPI } from '../services/api';
import Modal from './Modal';
import PostCard from './PostCard';
import styles from './posts.module.css';

export default function PostDetailModal({ postId, onClose, actionError, ...cardProps }) {
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetchAPI('/posts/' + postId, { signal: controller.signal })
      .then((result) => setPost(result.data))
      .catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message); });
    const changed = ({ detail }) => {
      if (detail.deletedId === postId) onClose();
      else if (detail.post?.id === postId) setPost((current) => current ? { ...current, ...detail.post } : current);
    };
    window.addEventListener('fella:post-change', changed);
    return () => { controller.abort(); window.removeEventListener('fella:post-change', changed); };
  }, [postId, onClose]);
  return <Modal title="Chi tiết bài viết" onClose={onClose} busy={cardProps.busy}>
    {error ? <p role="alert" className={styles.error}>{error}</p> : post ? <PostCard post={post} {...cardProps} /> : <p role="status">Đang tải chi tiết…</p>}
    {actionError && <p role="alert" className={styles.error}>{actionError}</p>}
  </Modal>;
}
