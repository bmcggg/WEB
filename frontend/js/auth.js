document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    // 1. XỬ LÝ ĐĂNG NHẬP

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const account = document.getElementById('account').value.trim();
            const password = document.getElementById('password').value;

            try {
                const data = await fetchAPI('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ account, password })
                });

                localStorage.setItem('fella_token', data.token);
                localStorage.setItem('fella_user', JSON.stringify(data.user));

                showAlert('Đăng nhập thành công! Đang chuyển hướng...', 'success');

                setTimeout(() => {
                    window.location.href = 'feed.html'; 
                }, 1000);

            } catch (err) {
                showAlert(err.message, 'error');
            }
        });
    }

    // 2. XỬ LÝ ĐĂNG KÝ
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const full_name = document.getElementById('full_name').value.trim();
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                await fetchAPI('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ full_name, username, email, password })
                });

                showAlert('Đăng ký thành công! Đang chuyển sang trang đăng nhập...', 'success');

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);

            } catch (err) {
                showAlert(err.message, 'error');
            }
        });
    }
});