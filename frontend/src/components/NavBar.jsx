import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './navbar.module.css';

export default function Navbar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('fella_user')) || {};

    const handleLogout = () => {
        localStorage.removeItem('fella_token');
        localStorage.removeItem('fella_user');
        navigate('/login');
    };

    return (
        <header className={styles.navbar}>
            <div className={styles.logo} onClick={() => navigate('/feed')}>
                Fella
            </div>
            
            <div className={styles.userInfo}>
                <Link to="/profile" className={styles.userProfileLink}>
                    <div 
                        className={`${styles.avatar} ${styles.avatarSm}`} 
                        style={user.avatar ? { backgroundImage: `url('${user.avatar}')` } : {}}
                    >
                        {!user.avatar && (user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className={styles.userName}>
                        {user.full_name || user.username || 'Xin chào!'}
                    </span>
                </Link>
                
                <button onClick={handleLogout} className={styles.btnLogout}>
                    Đăng xuất
                </button>
            </div>
        </header>
    );
}