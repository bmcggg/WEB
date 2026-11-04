import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { fetchAPI, assetUrl } from '../services/api';
import styles from './Reaction.module.css';

const REACTION_TYPES = [
    { type: 'LIKE', emoji: '👍', label: 'Thích' },
    { type: 'HEART', emoji: '❤️', label: 'Yêu thích' },
    { type: 'LAUGH', emoji: '😂', label: 'Haha' },
    { type: 'WOW', emoji: '😮', label: 'Wow' },
    { type: 'SAD', emoji: '😢', label: 'Buồn' },
    { type: 'ANGRY', emoji: '😡', label: 'Phẫn nộ' }
];

export default function ReactionList({ targetType, targetId, onClose = () => {}}) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedType, setSelectedType] = useState('ALL');

    // Tải danh sách người đã reaction
    useEffect(() => {
        const controller = new AbortController();

        async function fetchUsers() {
            try {
                setLoading(true);
                setError('');

                const response = await fetchAPI(`/reactions/${targetType}/${targetId}/users`,{ signal: controller.signal });

                if (!controller.signal.aborted)
                    setUsers(Array.isArray(response?.data) ? response.data : []);
            } catch (err) {
                if (err.name === 'AbortError') return;

                console.error('Lỗi tải danh sách reaction:', err);

                if (!controller.signal.aborted) 
                    setError( err.message ||'Không thể tải danh sách reaction.');
            } finally {
                if (!controller.signal.aborted) 
                    setLoading(false);
            }
        }

        const validTypes = ['post', 'comment', 'story'];

        if (targetId && Number.isInteger(Number(targetId)) && Number(targetId) > 0 &&validTypes.includes(targetType)) {
            fetchUsers();
        } else {
            setLoading(false);
            setError('Đối tượng không hợp lệ.');
        }

        return () => controller.abort();
    }, [targetType, targetId]);

    // Khóa cuộn trang và hỗ trợ phím ESC
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') 
                onClose();
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const getReaction = (type) => REACTION_TYPES.find(item => item.type === type);

    const getCount = (type) => {
        if (type === 'ALL') 
            return users.length;

        return users.filter(user => user.type === type).length;
    };

    const filteredUsers = users.filter(user => selectedType === 'ALL' || user.type === selectedType);

    const getAvatarUrl = (avatar) => {
        if (!avatar) return '/default-avatar.png';
            return assetUrl(avatar) || '/default-avatar.png';
    };

    const modal = (
        <div className={styles.reactionModalOverlay}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) 
                    onClose();
            }}
        >
            <div   className={styles.reactionModal}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Danh sách người bày tỏ cảm xúc"
            >
                <div className={styles.reactionModalHeader}>
                    <div className={styles.reactionModalTitle}>
                        Những người đã bày tỏ cảm xúc
                    </div>

                    <button
                        type="button"
                        className={styles.reactionCloseBtn}
                        onClick={onClose}
                        aria-label="Đóng"
                    >
                        ✕
                    </button>
                </div>

                <div className={styles.reactionTabs}>
                    <button
                        type="button"
                        className={
                            selectedType === 'ALL'? styles.activeTab: ''}
                        onClick={() => setSelectedType('ALL')}
                    >
                        Tất cả
                        <span>{getCount('ALL')}</span>
                    </button>

                    {REACTION_TYPES.map(item => {
                        const count = getCount(item.type);
                        if (count === 0) 
                            return null;

                        return (
                            <button
                                key={item.type}
                                type="button"
                                className={ selectedType === item.type? styles.activeTab : ''
                                }
                                onClick={() => setSelectedType(item.type)}
                                title={item.label}
                            >
                                <span>{item.emoji}</span>
                                <span>{count}</span>
                            </button>
                        );
                    })}
                </div>

                <div className={styles.reactionUsersList}>
                    {loading ? (
                        <div className={styles.reactionEmpty}>
                            Đang tải danh sách...
                        </div>
                    ) : error ? (
                        <div className={styles.reactionEmpty}>
                            {error}
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className={styles.reactionEmpty}>
                            Chưa có ai bày tỏ cảm xúc.
                        </div>
                    ) : (
                        filteredUsers.map((user, index) => {
                            const reaction = getReaction(user.type);

                            const name =  user.full_name || user.username ||'Người dùng';

                            return (
                                <div key={`${user.user_id}-${index}`}
                                    className={styles.reactionUserItem}
                                >
                                    <div className={styles.avatarWrapper}>
                                        <img
                                            src={getAvatarUrl(user.avatar)}
                                            alt={name}
                                            className={styles.reactionAvatar}
                                            onError={(event) => {
                                                event.currentTarget.onerror = null;
                                                event.currentTarget.src =
                                                    '/default-avatar.png';
                                            }}
                                        />

                                        {reaction && (
                                            <span className={styles.avatarReaction}
                                                   title={reaction.label}
                                            >
                                                {reaction.emoji}
                                            </span>
                                        )}
                                    </div>

                                    <div className={styles.reactionUserInfo}>
                                        <span className={styles.reactionUserName}>
                                            {name}
                                        </span>

                                        {user.username && (
                                            <span className={styles.reactionUsername}>
                                                @{user.username}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
