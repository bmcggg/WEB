import React from 'react';
import { Link } from 'react-router-dom';
import '../pages/feed/feed.css';

export default function PostCard({ post }) {
    const avatarStyle = post.avatar ? { backgroundImage: `url('${post.avatar}')` } : {};
    const avatarText = post.avatar ? '' : (post.full_name || post.username).charAt(0).toUpperCase();

    return (
        <div className="post-card">
            <div className="post-header" style={{ display: 'flex', alignItems: 'center' }}>
                <Link to={`/profile?id=${post.user_id}`} style={{ textDecoration: 'none' }}>
                    <div className="avatar avatar-sm" style={avatarStyle}>{avatarText}</div>
                </Link>
                <div className="post-info" style={{ marginLeft: '10px' }}>
                    <Link to={`/profile?id=${post.user_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="post-author" style={{ fontWeight: 'bold' }}>
                            {post.full_name} <span className="post-username" style={{ fontWeight: 'normal', color: '#65676b' }}>@{post.username}</span>
                        </div>
                    </Link>
                    <div className="post-time" style={{ fontSize: '12px', color: '#65676b' }}>
                        {new Date(post.created_at).toLocaleString('vi-VN')}
                    </div>
                </div>
            </div>
            <div className="post-content" style={{ marginTop: '10px' }}>{post.content}</div>
        </div>
    );
}