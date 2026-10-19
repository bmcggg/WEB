document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fella_token');
    const currentUser = JSON.parse(localStorage.getItem('fella_user'));

    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('id') || (currentUser ? currentUser.id : null);

    if (!token || !targetUserId) {
        alert('Vui lòng đăng nhập!');
        window.location.href = 'login.html';
        return;
    }

    if (currentUser && currentUser.id != targetUserId) {
        const changeBtn = document.getElementById('changeAvatarBtn');
        if (changeBtn) changeBtn.style.display = 'none';
    }

    // 1. Tải thông tin Hồ sơ cá nhân
    async function loadProfile() {
        try {
            const response = await fetchAPI(`/auth/profile/${targetUserId}`);
            const user = response.data || response;

            document.getElementById('fullName').innerText = user.full_name || user.username;
            document.getElementById('username').innerText = `@${user.username}`;
            document.getElementById('bio').innerText = user.bio || 'Chưa có tiểu sử';

            const avatarEl = document.getElementById('userAvatar');
            if (user.avatar) {
                avatarEl.style.backgroundImage = `url('${user.avatar}')`;
                avatarEl.innerText = '';
            } else {
                avatarEl.innerText = (user.full_name || user.username).charAt(0).toUpperCase();
            }

            if (document.getElementById('postsCount')) 
                document.getElementById('postsCount').innerText = user.posts_count || 0;
            if (document.getElementById('followersCount')) 
                document.getElementById('followersCount').innerText = user.followers_count || 0;
            if (document.getElementById('followingCount')) 
                document.getElementById('followingCount').innerText = user.following_count || 0;

        } catch (err) {
            console.error('Lỗi tải profile:', err);
            document.getElementById('fullName').innerText = 'Không thể tải thông tin';
        }
    }

    // 2. Tải bài viết cá nhân
    async function loadUserPosts() {
        const container = document.getElementById('userPostsContainer');
        try {
            const response = await fetchAPI(`/posts/user/${targetUserId}`);
            const posts = response.data || response;

            if (!posts || posts.length === 0) {
                container.innerHTML = '<div class="empty-posts" style="text-align:center; color:#65676b; padding:20px;">Người dùng này chưa có bài viết nào.</div>';
                return;
            }

            container.innerHTML = posts.map(post => {
                const postDate = new Date(post.created_at).toLocaleString('vi-VN');
                const avatarStyle = post.avatar ? `style="background-image: url('${post.avatar}')"` : '';
                const avatarText = post.avatar ? '' : (post.full_name || post.username).charAt(0).toUpperCase();

                return `
                    <div class="post-card" style="background:#fff; padding:15px; border-radius:8px; margin-bottom:15px; box-shadow:0 1px 2px rgba(0,0,0,0.1);">
                        <div class="post-header" style="display:flex; align-items:center;">
                            <div class="avatar avatar-sm" ${avatarStyle}>${avatarText}</div>
                            <div class="post-info" style="margin-left: 10px;">
                                <div class="post-author" style="font-weight: bold;">${post.full_name}</div>
                                <div class="post-time" style="font-size: 12px; color: #65676b;">${postDate}</div>
                            </div>
                        </div>
                        <div class="post-content" style="margin-top: 10px;">${post.content}</div>
                    </div>
                `;
            }).join('');

        } catch (err) {
            console.error('Lỗi tải bài viết cá nhân:', err);
            container.innerHTML = `<div class="empty-posts" style="color:red; text-align:center;">Lỗi: ${err.message}</div>`;
        }
    }

    // 3. Upload và Cập nhật Avatar mới
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const input = e.target;
            if (!input.files || !input.files[0]) return;

            const formData = new FormData();
            formData.append('avatar', input.files[0]);
            formData.append('userId', currentUser.id);

            try {
                const res = await fetch('/auth/update-avatar', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                const result = await res.json();
                if (res.ok) {
                    alert('Cập nhật avatar thành công!');
                    currentUser.avatar = result.avatar;
                    localStorage.setItem('fella_user', JSON.stringify(currentUser));
                    loadProfile();
                } else {
                    alert(result.error || 'Cập nhật avatar thất bại');
                }
            } catch (err) {
                console.error('Lỗi upload avatar:', err);
                alert('Có lỗi xảy ra khi tải ảnh lên!');
            }
        });
    }

    // 4. Xử lý Đăng xuất
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('fella_token');
            localStorage.removeItem('fella_user');
            window.location.href = 'login.html';
        });
    }

    loadProfile();
    loadUserPosts();
});