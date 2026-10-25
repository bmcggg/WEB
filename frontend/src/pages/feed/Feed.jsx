import React, { useState } from 'react';
import Navbar from '../../components/NavBar';
import LeftSidebar from '../../components/LeftSidebar';
import CreatePost from '../../components/CreatePost';
import PostList from '../../components/PostList';
import styles from './feed.module.css';

export default function Feed() {
  const [revision, setRevision] = useState(0);

  return (
    <div className={styles.pageWrapper}>
      <Navbar />
      <div className={styles.feedLayout}>
        {/* SIDEBAR BÊN TRÁI PHONG CÁCH FACEBOOK */}
        <LeftSidebar />

        {/* CỘT NỘI DUNG CHÍNH (BẢNG TIN & ĐĂNG TUS) */}
        <main className={styles.feedColumn}>
          <div className={styles.feedHeader}>
            <h1 className={styles.heading}>Bảng tin</h1>
            <p className={styles.subtitle}>Những chia sẻ mới từ bạn bè và cộng đồng Fella</p>
          </div>

          <CreatePost onCreated={() => setRevision((current) => current + 1)} />

          <PostList
            key={revision}
            endpoint="/posts"
            emptyMessage="Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ khoảnh khắc!"
          />
        </main>
      </div>
    </div>
  );
}
