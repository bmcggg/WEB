import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import styles from './Reaction.module.css';
import ReactionList from './ReactionList';

const API_URL = 'http://localhost:5000/api/reactions';

const REACTION_TYPES = [
    { type: 'LIKE', emoji: '👍', label: 'Thích' },
    { type: 'HEART', emoji: '❤️', label: 'Yêu thích' },
    { type: 'LAUGH', emoji: '😂', label: 'Haha' },
    { type: 'WOW', emoji: '😮', label: 'Wow' },
    { type: 'SAD', emoji: '😢', label: 'Buồn' },
    { type: 'ANGRY', emoji: '😡', label: 'Phẫn nộ' }
];

const VALID_TARGET_TYPES = ['post', 'comment', 'story', 'message'];

export default function Reaction({ postId, targetType, targetId, currentUser}) {
    const id = targetId ?? postId;
    const userId = currentUser?.id;
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState({});
    const [userReaction, setUserReaction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [showReactionList, setShowReactionList] = useState(false);

    // Tải thống kê reaction
    const loadReactions = useCallback(async () => {
        if (!id || !VALID_TARGET_TYPES.includes(targetType)) 
            return;

        try {
            const response = await axios.get(`${API_URL}/${targetType}/${id}`,
                {params: userId ? { userId } : {}});

            const data = response.data?.data;

            if (!data) 
                throw new Error('Dữ liệu reaction không hợp lệ.');

            setTotal(Number(data.total) || 0);
            setStats(data.stats || {});
            setUserReaction(data.userReaction || null);
            setError('');
        } catch (err) {
            console.error('Lỗi tải reactions:', err);
            setError('Không thể tải reaction.');
        }
    }, [id, targetType, userId]);

    useEffect(() => {
        loadReactions();
    }, [loadReactions]);

    // Thêm, đổi hoặc xóa reaction
    const handleReaction = async (type) => {
        if (!userId) {
            setError('Bạn cần đăng nhập để reaction.');
            return;
        }

        if (!id || !VALID_TARGET_TYPES.includes(targetType)) {
            setError('Đối tượng reaction không hợp lệ.');
            return;
        }

        if (loading) return;

        setLoading(true);
        setError('');
        setShowPicker(false);

        try {
            const payload = {
                user_id: userId,
                type
            };

            if (targetType === 'post') 
                payload.post_id = id;
            else if (targetType === 'comment') 
                payload.comment_id = id;
            else if (targetType === 'story') 
                payload.story_id = id;
            else if(targetType === 'message')
                payload.message_id = id;

            await axios.post(`${API_URL}/toggle`, payload);

            await loadReactions();
        } catch (err) {
            console.error('Lỗi reaction:', err);

            setError( err.response?.data?.message || err.response?.data?.error ||  'Không thể thực hiện reaction.' );
        } finally {
            setLoading(false);
        }
    };

    // Nút Like chính
    const handleMainLikeClick = () => {
        handleReaction(userReaction || 'LIKE');
    };

    // Reaction hiện tại của người dùng
    const selectedReaction = REACTION_TYPES.find( item => item.type === userReaction );

    // Các reaction có số lượng lớn hơn 0
    const displayedReactions = REACTION_TYPES.filter(item => Number(stats[item.type] || 0) > 0)
                                             .sort((a, b) => {
                                                return Number(stats[b.type] || 0) - Number(stats[a.type] || 0);});

    // Đóng danh sách reaction
    const handleCloseReactionList = useCallback(() => {
        setShowReactionList(false);
    }, []);

    return (
        <>
            <div className={styles.reactionWrapper}>

                {/* KHU VỰC NÚT LIKE */}
                <div className={styles.likeArea}
                    onMouseEnter={() => setShowPicker(true)}
                    onMouseLeave={() => setShowPicker(false)}
                >
                    {showPicker && (
                        <div className={styles.reactionPickerPopup}>
                            {REACTION_TYPES.map(item => (
                                <button  key={item.type} 
                                        type="button"
                                        className={styles.pickerIconBtn}
                                        onClick={() => handleReaction(item.type)}
                                        title={item.label}   
                                        disabled={loading}
                                >
                                    {item.emoji}
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        className={`${styles.mainLikeBtn} ${
                            userReaction ? styles.active : ''
                        }`}
                        onClick={handleMainLikeClick}
                        disabled={loading}
                    >
                        <span
                            className={!selectedReaction? styles.likeIconGray: styles.likeIcon}
                        >
                            {selectedReaction?.emoji || '👍'}
                        </span>

                        <span className={styles.btnText}>
                            {selectedReaction?.label || 'Thích'}
                        </span>
                    </button>
                </div>

                {/* THỐNG KÊ REACTION */}
                {total > 0 && (
                    <button type="button"
                            className={styles.reactionSummary}
                            title="Xem những người đã bày tỏ cảm xúc"
                            onMouseEnter={() => setShowPicker(false)}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            setShowPicker(false);
                            setShowReactionList(true);
                        }}
                    >
                        <span className={styles.summaryIcons}>
                            {displayedReactions.map(item => (
                                <span key={item.type}
                                    className={styles.summaryEmoji}
                                    title={item.label}
                                >
                                    {item.emoji}
                                </span>
                            ))}
                        </span>

                        <span className={styles.summaryTotal}>
                            {total}
                        </span>
                    </button>
                )}
            </div>

            {/* MODAL DANH SÁCH NGƯỜI REACTION */}
            {showReactionList && (
                <ReactionList targetType={targetType}
                    targetId={id}
                    onClose={handleCloseReactionList}
                />
            )}

            {/* THÔNG BÁO LỖI */}
            {error && (
                <div className={styles.reactionError}>
                    {error}
                </div>
            )}
        </>
    );
}
