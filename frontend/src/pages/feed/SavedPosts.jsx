import React from 'react';
import Navbar from '../../components/NavBar';
import LeftSidebar from '../../components/LeftSidebar';
import PostList from '../../components/PostList';
import styles from './feed.module.css';

export default function SavedPosts() {
  return (
    <div className={styles.pageWrapper}>
      <Navbar />
      <div className={styles.feedLayout}>
        <LeftSidebar />
        <main className={styles.feedColumn}>
          <div className={styles.feedHeader}>
            <h1 className={styles.heading}>Bài viết đã lưu</h1>
            <p className={styles.subtitle}>Những chia sẻ bạn đã lưu lại để xem sau</p>
          </div>
          <PostList
            endpoint="/posts/saved"
            saved
            emptyMessage="Bạn chưa lưu bài viết nào còn quyền xem."
          />
        </main>
      </div>
    </div>
  );
}
