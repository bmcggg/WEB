import { Link } from 'react-router-dom';
import { assetUrl } from '../services/api';
import PostMedia from './PostMedia';
import styles from './PostCard.module.css';

export default function PostCard({ post, currentUser, onSaveToggle, onEdit, onDelete, onOpenDetail, busy = false }) {
  const owned = Number(currentUser?.id) === post.user_id;
  const name = post.full_name || post.username || 'Người dùng';
  return (
    <article className={styles.postCard} aria-label={'Bài viết của ' + name}>
      <header className={styles.postHeader}>
        <Link to={'/profile?id=' + post.user_id} className={styles.avatarLink} aria-label={'Trang cá nhân ' + name}>
          <div className={styles.avatar} style={post.avatar ? { backgroundImage: 'url("' + assetUrl(post.avatar) + '")' } : {}}>
            {!post.avatar && name.charAt(0).toUpperCase()}
          </div>
        </Link>
        <div className={styles.postInfo}>
          <Link to={'/profile?id=' + post.user_id} className={styles.authorLink}>{name}</Link>
          <span className={styles.postUsername}> @{post.username}</span>
          <div className={styles.postTime}>
            <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleString('vi-VN')}</time>
            {' · '}{post.privacy === 'PUBLIC' ? 'Công khai' : post.privacy === 'FRIENDS' ? 'Bạn bè (chỉ mình tôi)' : 'Chỉ mình tôi'}
            {post.updated_at && new Date(post.updated_at) > new Date(post.created_at) && ' · Đã chỉnh sửa'}
          </div>
        </div>
      </header>
      <p className={styles.postContent}>{post.content}</p>
      <div className={styles.mediaGrid}>
        {(post.media || []).map((media) => <PostMedia key={media.id} media={media} />)}
      </div>
      <footer className={styles.actions}>
        {onOpenDetail && <button onClick={() => onOpenDetail(post)}>Xem chi tiết</button>}
        {onSaveToggle && <button disabled={busy} aria-pressed={post.is_saved} onClick={() => onSaveToggle(post)}>{post.is_saved ? 'Bỏ lưu' : 'Lưu bài'}</button>}
        {owned && onEdit && <button disabled={busy} onClick={() => onEdit(post)}>Sửa</button>}
        {owned && onDelete && <button disabled={busy} className={styles.danger} onClick={() => onDelete(post)}>Xóa</button>}
      </footer>
    </article>
  );
}
