import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Navbar from '../../components/NavBar';
import CreatePost from '../../components/CreatePost';
import PostList from '../../components/PostList';
import NoticeModal from '../../components/NoticeModal';
import MutualFriendsModal from '../../components/MutualFriendsModal';
import SocialGraphModal from '../../components/SocialGraphModal';
import { assetUrl, fetchAPI, logoutAPI } from '../../services/api';
import styles from './profile.module.css';

const MAX_BIO_LENGTH = 101; // Chuẩn Facebook bio 101 ký tự

function readUser() {
  try { return JSON.parse(localStorage.getItem('fella_user') || 'null'); }
  catch { return null; }
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [postRevision, setPostRevision] = useState(0);
  const [isMutualModalOpen, setIsMutualModalOpen] = useState(false);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);

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

  // Load Profile & Friends
  useEffect(() => {
    if (!targetUserId) {
      navigate('/login', { replace: true });
      return;
    }
    let active = true;

    // 1. Tải thông tin hồ sơ
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
      .catch((error) => {
        if (active) setProfile({ error: error.message });
      });

    // 2. Tải danh sách bạn bè chính thức từ Graph
    fetchAPI(`/social/friends/${encodeURIComponent(targetUserId)}`)
      .then((response) => {
        if (active) {
          setFriends(response.data || []);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [navigate, targetUserId]);

  // CẬP NHẬT ẢNH ĐẠI DIỆN
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

  // CẬP NHẬT ẢNH BÌA THẬT LÊN SERVER
  const handleCoverChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;
    const formData = new FormData();
    formData.append('cover', file);

    try {
      const result = await fetchAPI('/auth/update-cover', {
        method: 'POST',
        body: formData,
      });

      setProfile((current) => ({ ...current, cover: result.cover }));

      setModal({
        isOpen: true,
        type: 'success',
        title: 'Đã cập nhật ảnh bìa!',
        message: 'Ảnh bìa mới đã được lưu thành công trên trang cá nhân của bạn.',
        confirmText: 'OK',
      });
    } catch (error) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Tải ảnh bìa thất bại',
        message: error.message || 'Không thể tải ảnh bìa lên. Vui lòng thử lại!',
        confirmText: 'Đóng',
      });
    } finally {
      event.target.value = '';
    }
  };

  // LƯU THÔNG TIN PROFILE (BIO, HỌ TÊN)
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

  // HÀNH ĐỘNG FOLLOW / UNFOLLOW
  const handleFollow = async () => {
    try {
      await fetchAPI(`/social/follow/${targetUserId}`, { method: 'POST' });
      setProfile((prev) => ({
        ...prev,
        followers_count: (prev.followers_count || 0) + 1,
        relationship: { ...(prev.relationship || {}), is_following: true },
      }));
    } catch (err) {
      setModal({ isOpen: true, type: 'error', title: 'Lỗi', message: err.message });
    }
  };

  const handleUnfollow = async () => {
    try {
      await fetchAPI(`/social/follow/${targetUserId}`, { method: 'DELETE' });
      setProfile((prev) => ({
        ...prev,
        followers_count: Math.max(0, (prev.followers_count || 0) - 1),
        relationship: { ...(prev.relationship || {}), is_following: false },
      }));
    } catch (err) {
      setModal({ isOpen: true, type: 'error', title: 'Lỗi', message: err.message });
    }
  };

  // HÀNH ĐỘNG GỬI LỜI MỜI KẾT BẠN
  const handleSendFriendRequest = async () => {
    try {
      await fetchAPI(`/social/friends/request/${targetUserId}`, { method: 'POST' });
      setProfile((prev) => ({
        ...prev,
        relationship: {
          ...(prev.relationship || {}),
          friendship_status: 'PENDING',
          is_requester: true,
        },
      }));
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Đã gửi lời mời',
        message: 'Lời mời kết bạn đã được gửi thành công!',
        confirmText: 'OK',
      });
    } catch (err) {
      setModal({ isOpen: true, type: 'error', title: 'Lỗi', message: err.message });
    }
  };

  // HÀNH ĐỘNG CHẤP NHẬN LỜI MỜI KẾT BẠN
  const handleAcceptFriend = async () => {
    try {
      await fetchAPI(`/social/friends/accept/${targetUserId}`, { method: 'PUT' });
      setProfile((prev) => ({
        ...prev,
        friends_count: (prev.friends_count || 0) + 1,
        relationship: {
          ...(prev.relationship || {}),
          friendship_status: 'ACCEPTED',
        },
      }));
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Thành công',
        message: 'Hai bạn hiện đã là bạn bè trên Fella!',
        confirmText: 'Tuyệt vời',
      });
    } catch (err) {
      setModal({ isOpen: true, type: 'error', title: 'Lỗi', message: err.message });
    }
  };

  // HÀNH ĐỘNG HỦY KẾT BẠN / HỦY LỜI MỜI
  const handleRemoveFriend = async () => {
    setModal({
      isOpen: true,
      type: 'info',
      title: 'Xác nhận',
      message: 'Bạn có chắc chắn muốn hủy kết bạn / xóa lời mời với người dùng này không?',
      confirmText: 'Xác nhận',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await fetchAPI(`/social/friends/${targetUserId}`, { method: 'DELETE' });
          setProfile((prev) => ({
            ...prev,
            friends_count: Math.max(0, (prev.friends_count || 0) - 1),
            relationship: {
              ...(prev.relationship || {}),
              friendship_status: 'NONE',
              is_requester: false,
            },
          }));
        } catch (err) {
          setModal({ isOpen: true, type: 'error', title: 'Lỗi', message: err.message });
        }
      },
    });
  };

  const avatar = profile?.avatar ? { backgroundImage: `url('${assetUrl(profile.avatar)}')` } : {};
  const avatarText = (profile?.full_name || profile?.username || 'U').charAt(0).toUpperCase();
  const coverBg = profile?.cover ? { backgroundImage: `url('${assetUrl(profile.cover)}')` } : {};

  return (
    <div className={styles.profilePage}>
      <Navbar />

      {/* KHU VỰC ĐỈNH PROFILE: KHUNG ẢNH BÌA & AVATAR ĐÈ LÊN */}
      <div className={styles.headerContainer}>
        {/* KHUNG ẢNH BÌA CHUẨN FACEBOOK */}
        <div className={styles.coverWrapper} style={coverBg}>
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
              <div className={styles.statsSubtitle} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>{friends.length || profile?.friends_count || 0} bạn bè</span>
                <span className={styles.dot}>•</span>
                <span>{profile?.followers_count || 0} người theo dõi</span>
                <span className={styles.dot}>•</span>
                <span>{profile?.following_count || 0} đang theo dõi</span>

                {/* HIỂN THỊ SỐ BẠN CHUNG VÀ MỞ MODAL BẠN CHUNG */}
                {profile?.relationship?.mutual_friends_count > 0 && (
                  <>
                    <span className={styles.dot}>•</span>
                    <button
                      type="button"
                      onClick={() => setIsMutualModalOpen(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 'inherit',
                      }}
                      title="Bấm để xem danh sách bạn chung"
                    >
                      🔗 {profile.relationship.mutual_friends_count} bạn chung
                    </button>
                  </>
                )}
              </div>
              {profile?.bio && (
                <p className={styles.profileBioText}>{profile.bio}</p>
              )}
            </div>

            {/* CỤM NÚT HÀNH ĐỘNG */}
            {isOwnProfile ? (
              <div className={styles.headerButtons} style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={styles.btnPrimaryAction}
                  onClick={() => setIsEditing((prev) => !prev)}
                >
                  ✏️ Chỉnh sửa trang cá nhân
                </button>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsGraphModalOpen(true)}
                  style={{
                    backgroundColor: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                  }}
                  title="Xem trực quan đồ thị mạng lưới bạn bè"
                >
                  🌐 Đồ thị bạn bè
                </button>
              </div>
            ) : (
              <div className={styles.headerButtons} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {/* 1. NÚT KẾT BẠN / BẠN BÈ / HỦY LỜI MỜI */}
                {profile?.relationship?.friendship_status === 'ACCEPTED' ? (
                  <button
                    type="button"
                    onClick={handleRemoveFriend}
                    style={{
                      backgroundColor: 'var(--bg-hover)',
                      color: 'var(--text-primary)',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    👥 Bạn bè (Hủy kết bạn)
                  </button>
                ) : profile?.relationship?.friendship_status === 'PENDING' ? (
                  profile?.relationship?.is_requester ? (
                    <button
                      type="button"
                      onClick={handleRemoveFriend}
                      style={{
                        backgroundColor: 'var(--bg-hover)',
                        color: 'var(--text-secondary)',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      ↩ Hủy lời mời
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={handleAcceptFriend}
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: '#fff',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          border: 'none',
                        }}
                      >
                        ✔ Chấp nhận
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveFriend}
                        style={{
                          backgroundColor: 'var(--bg-hover)',
                          color: 'var(--text-primary)',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        ✖ Xóa
                      </button>
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={handleSendFriendRequest}
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    + Thêm bạn bè
                  </button>
                )}

                {/* 2. NÚT FOLLOW / UNFOLLOW */}
                {profile?.relationship?.is_following ? (
                  <button
                    type="button"
                    onClick={handleUnfollow}
                    style={{
                      backgroundColor: 'var(--bg-hover)',
                      color: 'var(--text-primary)',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    ✔ Đang theo dõi
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFollow}
                    style={{
                      backgroundColor: 'var(--bg-hover)',
                      color: 'var(--text-primary)',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    + Theo dõi
                  </button>
                )}

                {/* 3. NÚT ĐỒ THỊ MẠNG LƯỚI */}
                <button
                  type="button"
                  onClick={() => setIsGraphModalOpen(true)}
                  style={{
                    backgroundColor: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                  }}
                  title="Xem trực quan đồ thị mạng lưới quan hệ"
                >
                  🌐 Đồ thị bạn bè
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
              Tất cả bài viết
            </button>
            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'friends' ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              Bạn bè ({friends.length})
            </button>
          </nav>
        </div>
      </div>

      {/* BỐ CỤC DƯỚI */}
      <div className={styles.profileBodyLayout}>
        {/* CỘT TRÁI (~360px): GIỚI THIỆU & CARD BẠN BÈ THẬT */}
        <aside className={styles.leftCol}>
          {/* CARD GIỚI THIỆU */}
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

          {/* CARD BẠN BÈ THỰC TẾ TỪ CƠ SỞ DỮ LIỆU ĐỒ THỊ */}
          <section className={styles.card}>
            <div className={styles.cardHeaderFlex}>
              <div>
                <h3 className={styles.cardTitle}>Bạn bè</h3>
                <p className={styles.cardSubText}>{friends.length} người bạn</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('friends')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Xem tất cả
              </button>
            </div>

            {friends.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '8px 0' }}>
                Chưa có bạn bè nào.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
                {friends.slice(0, 6).map((f) => (
                  <Link
                    key={f.id}
                    to={`/profile?id=${f.id}`}
                    style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center' }}
                  >
                    <div
                      style={{
                        width: '100%',
                        paddingTop: '100%',
                        borderRadius: '8px',
                        backgroundColor: 'var(--primary)',
                        color: '#fff',
                        position: 'relative',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundImage: f.avatar ? `url('${assetUrl(f.avatar)}')` : 'none',
                      }}
                    >
                      {!f.avatar && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontWeight: 'bold',
                            fontSize: '18px',
                          }}
                        >
                          {(f.full_name || f.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        marginTop: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f.full_name || f.username}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>

        {/* CỘT PHẢI: BÀI VIẾT HOẶC DANH SÁCH BẠN BÈ */}
        <main className={styles.rightCol}>
          {activeTab === 'all' && (
            <>
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
            </>
          )}

          {activeTab === 'friends' && (
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 16px', color: 'var(--text-primary)' }}>
                Tất cả bạn bè ({friends.length})
              </h2>

              {friends.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0' }}>
                  Chưa có người bạn nào trong danh sách.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-surface)',
                      }}
                    >
                      <Link to={`/profile?id=${friend.id}`} style={{ textDecoration: 'none' }}>
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '18px',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundImage: friend.avatar ? `url('${assetUrl(friend.avatar)}')` : 'none',
                          }}
                        >
                          {!friend.avatar && (friend.full_name || friend.username || 'U').charAt(0).toUpperCase()}
                        </div>
                      </Link>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Link
                          to={`/profile?id=${friend.id}`}
                          style={{
                            fontWeight: '600',
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {friend.full_name || friend.username}
                        </Link>
                        {friend.bio && (
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {friend.bio}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* POPUP XEM DANH SÁCH BẠN CHUNG */}
      <MutualFriendsModal
        isOpen={isMutualModalOpen}
        targetUserId={targetUserId}
        onClose={() => setIsMutualModalOpen(false)}
      />

      {/* POPUP XEM ĐỒ THỊ MẠNG LƯỚI BẠN BÈ */}
      <SocialGraphModal
        isOpen={isGraphModalOpen}
        targetUserId={targetUserId}
        onClose={() => setIsGraphModalOpen(false)}
      />

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
