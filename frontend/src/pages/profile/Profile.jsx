import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/NavBar';
import CreatePost from '../../components/CreatePost';
import PostList from '../../components/PostList';
import NoticeModal from '../../components/NoticeModal';
import { assetUrl, fetchAPI, logoutAPI } from '../../services/api';
import styles from './profile.module.css';

const MAX_BIO_LENGTH = 101; // Chuẩn Facebook bio 101 ký tự

function readUser() {
  try { return JSON.parse(localStorage.getItem('fella_user') || 'null'); }
  catch { return null; }
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [postRevision, setPostRevision] = useState(0);
  const [coverPhoto, setCoverPhoto] = useState(null);

  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: null,
    onConfirm: null,
    onCancel: null,
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = readUser();
  const targetUserId = searchParams.get('id') || currentUser?.id;
  const isOwnProfile = String(currentUser?.id) === String(targetUserId);

  useEffect(() => {
    if (!targetUserId) {
      navigate('/login', { replace: true });
      return;
    }
    let active = true;
    fetchAPI(`/auth/profile/${encodeURIComponent(targetUserId)}`)
      .then((response) => {
        if (active) {
          const data = response.data || response;
          setProfile(data);
          setEditForm({
            full_name: data.full_name || '',
            bio: data.bio || '',
          });
        }
      })
      .catch((error) => { if (active) setProfile({ error: error.message }); });
    return () => { active = false; };
  }, [navigate, targetUserId]);

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const result = await fetchAPI('/auth/update-avatar', {
        method: 'POST',
        body: formData,
      });

      const updatedUser = { ...currentUser, avatar: result.avatar };
      localStorage.setItem('fella_user', JSON.stringify(updatedUser));
      setProfile((current) => ({ ...current, avatar: result.avatar }));

      setModal({
        isOpen: true,
        type: 'success',
        title: 'Đổi ảnh đại diện thành công!',
        message: 'Ảnh đại diện mới của bạn đã được cập nhật.',
        confirmText: 'OK',
      });
    } catch (error) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Tải ảnh thất bại',
        message: error.message || 'Không thể tải ảnh lên. Vui lòng thử lại!',
        confirmText: 'Đóng',
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleCoverChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setCoverPhoto(localUrl);
    setModal({
      isOpen: true,
      type: 'success',
      title: 'Đã cập nhật ảnh bìa!',
      message: 'Ảnh bìa mới đã được áp dụng trên trang cá nhân của bạn.',
      confirmText: 'OK',
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editForm.full_name.trim()) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Họ và tên không được để trống!',
        confirmText: 'Đã hiểu',
      });
      return;
    }

    setSaving(true);
    try {
      await fetchAPI('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: editForm.full_name.trim(),
          bio: editForm.bio.trim(),
        }),
      });

      const updatedUser = {
        ...currentUser,
        full_name: editForm.full_name.trim(),
        bio: editForm.bio.trim(),
      };
      localStorage.setItem('fella_user', JSON.stringify(updatedUser));

      setProfile((current) => ({
        ...current,
        full_name: editForm.full_name.trim(),
        bio: editForm.bio.trim(),
      }));
      setIsEditing(false);

      setModal({
        isOpen: true,
        type: 'success',
        title: 'Cập nhật thành công!',
        message: 'Thông tin trang cá nhân của bạn đã được lưu lại.',
        confirmText: 'Tuyệt vời',
      });
    } catch (error) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi cập nhật',
        message: error.message || 'Không thể cập nhật hồ sơ cá nhân!',
        confirmText: 'Đóng',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutClick = () => {
    setModal({
      isOpen: true,
      type: 'info',
      title: 'Đăng xuất tài khoản',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi mạng xã hội Fella không?',
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy',
      onConfirm: async () => {
        await logoutAPI();
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Đăng xuất thành công!',
          message: 'Hẹn gặp lại bạn!',
          confirmText: 'OK',
          onConfirm: () => navigate('/login', { replace: true }),
        });
        setTimeout(() => navigate('/login', { replace: true }), 1200);
      },
    });
  };

  const avatar = profile?.avatar ? { backgroundImage: `url('${assetUrl(profile.avatar)}')` } : {};
  const avatarText = (profile?.full_name || profile?.username || 'U').charAt(0).toUpperCase();

  return (
    <div className={styles.profilePage}>
      <Navbar />

      {/* KHU VỰC ĐỈNH PROFILE: KHUNG ẢNH BÌA & AVATAR ĐÈ LÊN */}
      <div className={styles.headerContainer}>
        {/* KHUNG ẢNH BÌA CHUẨN FACEBOOK */}
        <div
          className={styles.coverWrapper}
          style={coverPhoto ? { backgroundImage: `url('${coverPhoto}')` } : {}}
        >
          {isOwnProfile && (
            <>
              <label htmlFor="coverInput" className={styles.btnChangeCover}>
                📷 <span>Thêm ảnh bìa</span>
              </label>
              <input
                id="coverInput"
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={handleCoverChange}
              />
            </>
          )}
        </div>

        {/* KHU VỰC THÔNG TIN NGƯỜI DÙNG & AVATAR TRÒN LỚN */}
        <div className={styles.profileHeaderContent}>
          <div className={styles.avatarOverlapWrapper}>
            <div className={styles.avatarLg} style={avatar}>
              {profile?.avatar ? '' : avatarText}
            </div>
            {isOwnProfile && (
              <>
                <label htmlFor="avatarInput" className={styles.changeAvatarBtn} title="Đổi ảnh đại diện">
                  📷
                </label>
                <input
                  id="avatarInput"
                  type="file"
                  accept="image/*"
                  className={styles.hiddenInput}
                  onChange={handleAvatarChange}
                />
              </>
            )}
          </div>

          <div className={styles.nameAndActions}>
            <div className={styles.nameDetails}>
              <h1 className={styles.profileName}>
                {profile?.error ? 'Không thể tải' : (profile?.full_name || profile?.username || 'Đang tải...')}
              </h1>
              <div className={styles.statsSubtitle}>
                <span>{profile?.followers_count || 0} người theo dõi</span>
                <span className={styles.dot}>•</span>
                <span>{profile?.following_count || 0} đang theo dõi</span>
              </div>
              {profile?.bio && (
                <p className={styles.profileBioText}>{profile.bio}</p>
              )}
            </div>

            {isOwnProfile && (
              <div className={styles.headerButtons}>
                <button
                  type="button"
                  className={styles.btnPrimaryAction}
                  onClick={() => setIsEditing((prev) => !prev)}
                >
                  ✏️ Chỉnh sửa trang cá nhân
                </button>
              </div>
            )}
          </div>

          {/* FORM CHỈNH SỬA THÔNG TIN */}
          {isEditing && (
            <form onSubmit={handleSaveProfile} className={styles.editFormCard}>
              <div style={{ marginBottom: '12px' }}>
                <label className={styles.formLabel}>Họ và tên</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className={styles.formLabel}>Tiểu sử (Bio)</label>
                <textarea
                  className={styles.bioTextarea}
                  value={editForm.bio}
                  maxLength={MAX_BIO_LENGTH}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Mô tả ngắn về bạn..."
                />
                <div className={styles.charCounter}>
                  {MAX_BIO_LENGTH - (editForm.bio?.length || 0)} ký tự còn lại
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className={styles.btnSaveEdit}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={styles.btnCancelEdit}
                >
                  Hủy
                </button>
              </div>
            </form>
          )}

          <div className={styles.divider} />

          {/* THANH TABS FACEBOOK CHUẨN */}
          <nav className={styles.tabsNav}>
            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'all' ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'about' ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab('about')}
            >
              Giới thiệu
            </button>
            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'friends' ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              Bạn bè
            </button>
            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'photos' ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab('photos')}
            >
              Ảnh
            </button>
          </nav>
        </div>
      </div>

      {/* BỐ CỤC 2 CỘT CHUẨN FACEBOOK BÊN DƯỚI */}
      <div className={styles.profileBodyLayout}>
        {/* CỘT TRÁI (~360px): THÔNG TIN CÁ NHÂN & BẠN BÈ */}
        <aside className={styles.leftCol}>
          {/* CARD THÔNG TIN CÁ NHÂN (CHỈ HIỂN THỊ NỘI DUNG THẬT DO NGƯỜI DÙNG NHẬP) */}
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Giới thiệu</h3>
            {profile?.bio ? (
              <p className={styles.profileBioText} style={{ marginBottom: '12px', textAlign: 'center' }}>
                {profile.bio}
              </p>
            ) : null}
            {isOwnProfile && (
              <button
                type="button"
                className={styles.btnSecondaryFull}
                onClick={() => setIsEditing(true)}
              >
                {profile?.bio ? 'Chỉnh sửa tiểu sử' : 'Thêm tiểu sử'}
              </button>
            )}
          </section>

          {/* CARD BẠN BÈ (KHÔNG CÓ DỮ LIỆU THÌ ĐỂ TRỐNG) */}
          <section className={styles.card}>
            <div className={styles.cardHeaderFlex}>
              <div>
                <h3 className={styles.cardTitle}>Bạn bè</h3>
                <p className={styles.cardSubText}>{profile?.followers_count || 0} người bạn</p>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0' }}>
              Chưa có bạn bè nào.
            </p>
          </section>
        </aside>

        {/* CỘT PHẢI: TẠO BÀI VIẾT & DANH SÁCH BÀI VIẾT */}
        <main className={styles.rightCol}>
          {isOwnProfile && (
            <CreatePost onCreated={() => setPostRevision((prev) => prev + 1)} />
          )}

          <div className={styles.postSectionHeader}>
            <h2 className={styles.sectionTitle}>Bài viết</h2>
            <div className={styles.postFilterActions}>
              <button type="button" className={styles.btnFilter}>⚙️ Quản lý bài viết</button>
              <button type="button" className={styles.btnFilter}>⚡ Bộ lọc</button>
            </div>
          </div>

          {targetUserId && (
            <PostList
              key={`${targetUserId}-${postRevision}`}
              endpoint={`/posts/user/${encodeURIComponent(targetUserId)}`}
              emptyMessage="Chưa có bài viết nào bạn được phép xem."
              onDeleted={() => setProfile((current) => current ? { ...current, posts_count: Math.max(0, (current.posts_count || 0) - 1) } : current)}
            />
          )}
        </main>
      </div>

      {/* HỘP THOẠI POPUP THÔNG BÁO CHO PROFILE */}
      <NoticeModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText || 'OK'}
        cancelText={modal.cancelText}
        onCancel={() => setModal((prev) => ({ ...prev, isOpen: false }))}
        onClose={() => {
          if (modal.onConfirm) modal.onConfirm();
          else setModal((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
}
