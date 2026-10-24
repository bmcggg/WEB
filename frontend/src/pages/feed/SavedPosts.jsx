import Navbar from '../../components/NavBar';
import PostList from '../../components/PostList';
import styles from './feed.module.css';

export default function SavedPosts() {
  return <><Navbar /><main className={styles.feedContainer}>
    <h1 className={styles.heading}>Bài viết đã lưu</h1>
    <p className={styles.subtitle}>Những chia sẻ bạn muốn đọc lại</p>
    <PostList endpoint="/posts/saved" saved emptyMessage="Bạn chưa lưu bài viết nào còn quyền xem." />
  </main></>;
}
