import React from 'react';
import { Link } from 'react-router-dom';
import styles from './PostCard.module.css';

export default function PostCard({ post }) {
    const avatarStyle = post.avatar ? { backgroundImage: `url('${post.avatar}')` } : {};
    const avatarText = post.avatar ? '' : (post.full_name || post.username).charAt(0).toUpperCase();

    return (
        <div className={styles.postCard}>
            <div className={styles.postHeader}>
                <Link to={`/profile?id=${post.user_id}`} className={styles.avatarLink}>
                    <div className={`${styles.avatar} ${styles.avatarSm}`} style={avatarStyle}>{avatarText}</div>
                </Link>
                <div className={styles.postInfo}>
                    <Link to={`/profile?id=${post.user_id}`} className={styles.authorLink}>
                        <div className={styles.postAuthor}>
                            {post.full_name} <span className={styles.postUsername}>@{post.username}</span>
                        </div>
                    </Link>
                    <div className={styles.postTime}>
                        {new Date(post.created_at).toLocaleString('vi-VN')}
                    </div>
                </div>
            </div>
            <div className={styles.postContent}>{post.content}</div>
        </div>
    );
}