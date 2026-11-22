import React, { useState } from 'react';
import Navbar from '../../components/NavBar';
import LeftSidebar from '../../components/LeftSidebar';
import CreatePost from '../../components/CreatePost';
import PostList from '../../components/PostList';
import WidgetFriendSuggestions from '../../components/WidgetFriendSuggestions';
import NoticeModal from '../../components/NoticeModal';
import styles from './feed.module.css';

export default function Feed() {
  const [revision, setRevision] = useState(0);
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

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

          {/* WIDGET GỢI Ý KẾT BẠN THÔNG MINH DỰA TRÊN THUẬT TOÁN ĐỒ THỊ */}
          <WidgetFriendSuggestions onNotice={(n) => setModal({ isOpen: true, ...n })} />

          <CreatePost onCreated={() => setRevision((current) => current + 1)} />

          <PostList
            key={revision}
            endpoint="/posts"
            emptyMessage="Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ khoảnh khắc!"
          />
        </main>
      </div>

      <NoticeModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        confirmText="OK"
        onClose={() => setModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
