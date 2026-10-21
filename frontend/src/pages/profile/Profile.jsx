import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/NavBar';
import PostCard from '../../components/PostCard';
import { api, getAPIErrorMessage } from '../../services/api';
import styles from './profile.module.css';

function readUser() {
  try { return JSON.parse(localStorage.getItem('fella_user') || 'null'); }
  catch { return null; }
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postError, setPostError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = readUser();
  const targetUserId = searchParams.get('id') || currentUser?.id;
  const isOwnProfile = String(currentUser?.id) === String(targetUserId);

  useEffect(() => {
    if (!localStorage.getItem('fella_token') || !targetUserId) {
      navigate('/login', { replace: true });
      return;
    }
    let active = true;
    api.get(`/auth/profile/${encodeURIComponent(targetUserId)}`)
      .then(({ data }) => { if (active) setProfile(data.data || data); })
      .catch((error) => { if (active) setProfile({ error: getAPIErrorMessage(error) }); });
    api.get(`/posts/user/${encodeURIComponent(targetUserId)}`)
      .then(({ data }) => { if (active) setPosts(data.data || data || []); })
      .catch((error) => { if (active) setPostError(getAPIErrorMessage(error)); })
      .finally(() => { if (active) setLoadingPosts(false); });
    return () => { active = false; };
  }, [navigate, targetUserId]);

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('userId', currentUser.id);
    try {
      const response = await api.request({
        url: '/auth/update-avatar',
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('fella_token')}` },
        data: formData,
      });
      const result = response.data;
      window.alert('Cập nhật avatar thành công!');
      const updatedUser = { ...currentUser, avatar: result.avatar };
      localStorage.setItem('fella_user', JSON.stringify(updatedUser));
      setProfile((current) => ({ ...current, avatar: result.avatar }));
    } catch (error) {
      window.alert(getAPIErrorMessage(error) || 'Có lỗi xảy ra khi tải ảnh lên!');
    } finally {
      event.target.value = '';
    }
  };

  const avatar = profile?.avatar ? { backgroundImage: `url('${profile.avatar}')` } : {};
  const avatarText = (profile?.full_name || profile?.username || 'U').charAt(0).toUpperCase();

  return (
    <>
      <Navbar compact />
      <main className={styles.container}>
        <section className={styles.profileCard}>
          <div className={styles.avatarWrapper}>
            <div className={`${styles.avatar} ${styles.avatarLg}`} style={avatar}>{profile?.avatar ? '' : avatarText}</div>
            {isOwnProfile && <><label htmlFor="avatarInput" className={styles.changeAvatarBtn} title="Đổi ảnh đại diện">📷</label><input id="avatarInput" type="file" accept="image/*" className={styles.hiddenInput} onChange={handleAvatarChange} /></>}
          </div>
          <div className={styles.profileName}>{profile?.error ? 'Không thể tải thông tin' : (profile?.full_name || profile?.username || 'Đang tải...')}</div>
          <div className={styles.profileUsername}>{profile?.username ? `@${profile.username}` : '@username'}</div>
          <div className={styles.profileBio}>{profile?.bio || 'Chưa có tiểu sử'}</div>
          <div className={styles.statsBar}>
            <div className={styles.statItem}><div className={styles.statValue}>{profile?.posts_count || 0}</div><div className={styles.statLabel}>Bài viết</div></div>
            <div className={styles.statItem}><div className={styles.statValue}>{profile?.followers_count || 0}</div><div className={styles.statLabel}>Người theo dõi</div></div>
            <div className={styles.statItem}><div className={styles.statValue}>{profile?.following_count || 0}</div><div className={styles.statLabel}>Đang theo dõi</div></div>
          </div>
        </section>
        <h2 className={styles.sectionTitle}>Bài viết cá nhân</h2>
        {loadingPosts ? <div className={styles.emptyPosts}>Đang tải bài viết...</div>
          : postError ? <div className={`${styles.emptyPosts} ${styles.error}`}>Lỗi: {postError}</div>
            : posts.length === 0 ? <div className={styles.emptyPosts}>Người dùng này chưa có bài viết nào.</div>
              : posts.map((post) => <PostCard key={post.id} post={post} />)}
      </main>
    </>
  );
}
