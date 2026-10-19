import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../pages/feed/feed.css';

export default function Navbar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('fella_user')) || {};

    const handleLogout = () => {
        localStorage.removeItem('fella_token');
        localStorage.removeItem('fella_user');
        navigate('/login');
    };

    return (
        <header className="navbar">
            <div className="logo" onClick={() => navigate('/feed')} style={{ cursor: 'pointer' }}>
                Fella
            </div>
            
            <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Link to="/profile" className="user-profile-link" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="avatar avatar-sm" style={user.avatar ? { backgroundImage: `url('${user.avatar}')` } : {}}>
                        {!user.avatar && (user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 'bold', color: '#050505' }}>
                        {user.full_name || user.username || 'Xin chào!'}
                    </span>
                </Link>
                
                <button onClick={handleLogout} className="btn-logout">Đăng xuất</button>
            </div>
        </header>
    );
}