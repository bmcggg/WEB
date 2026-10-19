document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fella_token');
    const user = JSON.parse(localStorage.getItem('fella_user'));

    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

    const currentUserEl = document.getElementById('currentUser');
    if (currentUserEl) {
        currentUserEl.textContent = user.full_name || user.username;
    }

    const headerAvatarEl = document.getElementById('headerAvatar');
    if (headerAvatarEl) {
        if (user.avatar) {
            headerAvatarEl.style.backgroundImage = `url('${user.avatar}')`;
            headerAvatarEl.innerText = '';
        } else {
            headerAvatarEl.innerText = (user.full_name || user.username).charAt(0).toUpperCase();
        }
    }

    const postsContainer = document.getElementById('postsContainer');
    const postContent = document.getElementById('postContent');
    const submitPostBtn = document.getElementById('submitPostBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    async function loadPosts() {
        try {
            const response = await fetchAPI('/posts');
            const posts = response.data;

            if (!posts || posts.length === 0) {
                postsContainer.innerHTML = '<p style="text-align: center; color: #65676b;">Chưa có bài viết nào.</p>';
                return;
            }

            postsContainer.innerHTML = posts.map(post => {
                const avatarStyle = post.avatar ? `style="background-image: url('${post.avatar}')"` : '';
                const avatarText = post.avatar ? '' : (post.full_name || post.username).charAt(0).toUpperCase();

                return `
                    <div class="post-card">
                        <div class="post-header">
                            <!-- Bấm vào Avatar bài viết -> Chuyển hướng sang profile tác giả -->
                            <a href="profile.html?id=${post.user_id}" style="text-decoration: none;">
                                <div class="avatar avatar-sm" ${avatarStyle}>${avatarText}</div>
                            </a>
                            <div class="post-info" style="margin-left: 10px;">
                                <!-- Bấm vào Tên tác giả -> Chuyển hướng sang profile tác giả -->
                                <a href="profile.html?id=${post.user_id}" style="text-decoration: none; color: inherit;">
                                    <div class="post-author" style="font-weight: bold;">
                                        ${post.full_name} <span class="post-username" style="font-weight: normal; color: #65676b;">@${post.username}</span>
                                    </div>
                                </a>
                                <div class="post-time" style="font-size: 12px; color: #65676b;">
                                    ${new Date(post.created_at).toLocaleString('vi-VN')}
                                </div>
                            </div>
                        </div>
                        <div class="post-content" style="margin-top: 10px;">${post.content}</div>
                    </div>
                `;
            }).join('');

        } catch (err) {
            postsContainer.innerHTML = `<p style="text-align: center; color: red;">Lỗi: ${err.message}</p>`;
        }
    }
  
    submitPostBtn.addEventListener('click', async () => {
        const content = postContent.value.trim();
        if (!content) {
            alert('Vui lòng nhập nội dung bài viết!');
            return;
        }
        try {
            await fetchAPI('/posts', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: user.id,
                    content: content,
                    privacy: 'PUBLIC'
                })
            });
            postContent.value = ''; 
            loadPosts(); 
        } catch (err) {
            alert('Đăng bài thất bại: ' + err.message);
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('fella_token');
        localStorage.removeItem('fella_user');
        window.location.href = 'login.html';
    });

    loadPosts();
});