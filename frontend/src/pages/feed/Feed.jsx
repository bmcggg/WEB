import { useState } from 'react';
import Navbar from '../../components/NavBar';
import CreatePost from '../../components/CreatePost';
import PostList from '../../components/PostList';
import styles from './feed.module.css';

export default function Feed() {
  const [revision, setRevision] = useState(0);
  return (
    <>
      <Navbar />
      <main className={styles.feedContainer}>
        <h1 className={styles.heading}>Bảng tin</h1>
        <p className={styles.subtitle}>Những chia sẻ mới từ cộng đồng Fella</p>
        <CreatePost onCreated={() => setRevision((current) => current + 1)} />
        <PostList key={revision} endpoint="/posts" emptyMessage="Chưa có bài viết nào. Hãy chia sẻ điều đầu tiên!" />
      </main>
    </>
  );
}
