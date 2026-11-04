
import { useCallback, useEffect, useMemo, useRef, useState} from 'react';
import { fetchAPI, assetUrl } from '../services/api';
import styles from './Story.module.css';
import Reaction from './Reaction';

export default function StoryBar({ currentUser }) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [activeIndex, setActiveIndex] = useState(null);
    const [mediaSrc, setMediaSrc] = useState('');
    const [mediaLoading, setMediaLoading] = useState(false);
    const [mediaError, setMediaError] = useState('');
    const [deletingStory, setDeletingStory] = useState(false);
    const fileInputRef = useRef(null);

    const allStories = useMemo(() => {
        return groups.flatMap(group => (group.stories || []).map(story => ({
                ...story,
                user_id: group.user_id,
                username: group.username,
                full_name: group.full_name,
                avatar: group.avatar
            }))
        );
    }, [groups]);

    // Tải danh sách Story
    const loadStories = useCallback(async () => {
        try {
            const response = await fetchAPI('/stories');

            setGroups(response.data || []);
            setError('');
        } catch (err) {
            console.error('Lỗi tải Story:', err);
            setError(err.message || 'Không thể tải Story.');
        } finally {
            setLoading(false);
        }
    }, []);
    // Xóa Story của bản thân
    const handleDeleteStory = async () => {
        if (!activeStory?.id || deletingStory) return;

        // Chỉ cho phép người đăng xóa Story của mình
        if ( Number(activeStory.user_id) !== Number(currentUser?.id)) {
            setError('Bạn không có quyền xóa Story này.');
            return;
        }

        const confirmed = window.confirm('Bạn có chắc chắn muốn xóa Story này không?');

        if (!confirmed) return;

        setDeletingStory(true);
        setError('');

        try {
            await fetchAPI(`/stories/${activeStory.id}`, {
                method: 'DELETE'
            });

            // Xóa Story khỏi danh sách hiện tại
            setGroups(currentGroups =>
                currentGroups
                    .map(group => ({
                        ...group,
                        stories: (group.stories || []).filter(
                            story => Number(story.id) !== Number(activeStory.id))
                    }))
                    .filter(group => group.stories.length > 0)
            );

            // Đóng Story Viewer
            setActiveIndex(null);
            setMediaSrc('');
            setMediaError('');
            setMediaLoading(false);

        } catch (err) {
            console.error('Lỗi xóa Story:', err);

            setError( err.message || 'Không thể xóa Story.');
        } finally {
            setDeletingStory(false);
        }
    };
    useEffect(() => { loadStories();}, [loadStories]);
    const handleFileChange = async event => {
    const file = event.target.files?.[0];
    // Cho phép chọn lại cùng một file
    event.target.value = '';

    if (!file) return;

    if (!['image/', 'video/'].some(type => file.type.startsWith(type))) {
        setError('Chỉ được chọn ảnh hoặc video.');
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        setError('Dung lượng file tối đa là 50 MB.');
        return;
    }

    const formData = new FormData();
    formData.append('media', file);

    setUploading(true);
    setError('');

    try {
        await fetchAPI('/stories', {
            method: 'POST',
            body: formData
        });

        await loadStories();
    } catch (err) {
        console.error('Lỗi đăng Story:', err);
        setError(err.message || 'Không thể đăng Story.');
    } finally {
        setUploading(false);
    }
};

    // Mở Story của một người dùng
    const openStory = group => {
        const firstStory = allStories.findIndex(story => story.user_id === group.user_id);

        if (firstStory !== -1) 
            setActiveIndex(firstStory);
    };

    // Chuyển Story trước
    const previousStory = () => {
        setActiveIndex(current => current > 0 ? current - 1 : current);
    };

    // Chuyển Story tiếp theo
    const nextStory = () => {
        setActiveIndex(current => {
            if (current === null) 
                return null;

            if (current >= allStories.length - 1) 
                return null;
            return current + 1;
        });
    };

    const activeStory = activeIndex !== null ? allStories[activeIndex] : null;

    // Tải ảnh/video Story có xác thực JWT
    useEffect(() => {
        if (!activeStory?.id) {
            setMediaSrc('');
            setMediaLoading(false);
            setMediaError('');
            return;
        }

        const controller = new AbortController();
        let objectUrl = '';

        setMediaSrc('');
        setMediaLoading(true);
        setMediaError('');

        async function loadStoryMedia() {
            try {
                const blob = await fetchAPI(`/stories/${activeStory.id}/media`,
                    {
                        responseType: 'blob',
                        signal: controller.signal
                    }
                );

                if (controller.signal.aborted) 
                    return;

                objectUrl = URL.createObjectURL(blob);
                setMediaSrc(objectUrl);
            } catch (err) {
                if (err.name === 'AbortError') return;

                console.error('Lỗi tải nội dung Story:', err);
                setMediaError( err.message || 'Không thể tải Story.');
            } finally {
                if (!controller.signal.aborted) 
                    setMediaLoading(false);
            }
        }

        loadStoryMedia();

        return () => {
            controller.abort();

            if (objectUrl) 
                URL.revokeObjectURL(objectUrl);
        };
    }, [activeStory?.id]);

    const getName = user => user?.full_name || user?.username || 'Người dùng';
    const getAvatar = user => user?.avatar ? assetUrl(user.avatar) : '';
    const ownGroup = groups.find( group => Number(group.user_id) === Number(currentUser?.id));
    const otherGroups = groups.filter(group => Number(group.user_id) !== Number(currentUser?.id));

    return (
        <>
        <section className={styles.container}>
                {/* TIÊU ĐỀ */}
            <div className={styles.heading}>
                <strong className={styles.headingTitle}> Story </strong>
                    <button
                        type="button"
                        className={styles.addButton}
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {uploading ? 'Đang đăng...' : '+ Tạo Story'}
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        hidden
                        onChange={handleFileChange}
                    />
            </div>

                {/* THÔNG BÁO LỖI */}
                {error && (
                    <p role="alert" className={styles.error}> {error} </p>
                )}

                {/* DANH SÁCH STORY */}
                <div className={styles.list}>
                {/* STORY CỦA BẢN THÂN */}
                <button
                    type="button"
                    className={styles.storyItem}
                    onClick={() => {
                        if (ownGroup) 
                            openStory(ownGroup);
                        else 
                            fileInputRef.current?.click();
                    }}
                >
                    <div className={styles.addAvatar}>
                        {currentUser?.avatar ? (
                            <img
                                src={getAvatar(currentUser)}
                                alt={getName(currentUser)}
                                className={styles.avatar}
                            />
                        ) : (
                            <span>
                                {getName(currentUser).charAt(0).toUpperCase()}
                            </span>
                        )}

                        <span className={styles.plus}>+</span>
                    </div>

                    <span className={styles.storyName}>
                        Tin của bạn
                    </span>
                </button>

                {/* STORY CỦA NGƯỜI KHÁC */}
                {otherGroups.map(group => (
                    <button
                        type="button"
                        key={group.user_id}
                        className={styles.storyItem}
                        onClick={() => openStory(group)}
                    >
                        <div className={styles.storyRing}>
                            {group.avatar ? (
                                <img
                                    src={getAvatar(group)}
                                    alt={getName(group)}
                                    className={styles.avatar}
                                />
                            ) : (
                                <span className={styles.fallbackAvatar}>
                                    {getName(group).charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>

                        <span className={styles.storyName}>
                            {getName(group)}
                        </span>
                    </button>
                ))}

                {loading && (
                    <span className={styles.status}>
                        Đang tải Story...
                    </span>
                )}

                {!loading && groups.length === 0 && (
                    <span className={styles.status}>
                        Chưa có Story nào.
                    </span>
                )}
            </div>
        </section>
            {/* MODAL XEM STORY */}
            {activeStory && (
                <div className={styles.overlay}
                    onClick={() => setActiveIndex(null)}
                >
                <div className={styles.viewer}
                    onClick={event => event.stopPropagation()}
                >
                {/* THÔNG TIN NGƯỜI ĐĂNG */}
                <div className={styles.viewerHeader}>
                    <div className={styles.viewerUser}>
                        {activeStory.avatar ? (
                            <img
                                src={getAvatar(activeStory)}
                                alt={getName(activeStory)}
                                className={styles.viewerAvatar}
                            />
                        ) : (
                            <div className={styles.viewerFallback}>
                                {getName(activeStory).charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div>
                            <strong>{getName(activeStory)}</strong>

                            <div className={styles.time}>
                                {new Date(
                                    activeStory.created_at
                                ).toLocaleString('vi-VN')}
                            </div>
                        </div>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
    {/* NÚT XÓA - CHỈ HIỆN VỚI STORY CỦA MÌNH */}
    {Number(activeStory.user_id) === Number(currentUser?.id) && (
        <button
            type="button"
            disabled={deletingStory}
            onClick={handleDeleteStory}
            title="Xóa Story"
            aria-label="Xóa Story"
            className={styles.deleteBtn}
        >
            {deletingStory ? '...' : '🗑️'}
        </button>
    )}

    {/* NÚT ĐÓNG */}
    <button
        type="button"
        className={styles.closeButton}
        onClick={() => setActiveIndex(null)}
        aria-label="Đóng Story"
    >
        ×
    </button>
            </div>
                </div>

                {/* NỘI DUNG ẢNH / VIDEO */}
                <div className={styles.mediaContainer}>
                    {mediaLoading && (
                        <p className={styles.mediaStatus}>
                            Đang tải Story...
                        </p>
                    )}

                    {mediaError && (
                        <p className={styles.mediaError}>
                            {mediaError}
                        </p>
                    )}

                    {mediaSrc && activeStory.media_type === 'VIDEO' && (
                        <video
                            key={activeStory.id}
                            src={mediaSrc}
                            controls
                            autoPlay
                            playsInline
                            className={styles.media}
                        />
                    )}

                    {mediaSrc && activeStory.media_type === 'IMAGE' && (
                        <img
                            key={activeStory.id}
                            src={mediaSrc}
                            alt="Story"
                            className={styles.media}
                        />
                    )}
                </div>

                {/* CẢM XÚC STORY */}
                <div className={styles.storyReaction}>
                    <Reaction
                        targetType="story"
                        targetId={activeStory.id}
                        currentUser={currentUser}
                    />
                </div>

                {/* CHUYỂN STORY TRƯỚC */}
                <button
                    type="button"
                    className={`${styles.navButton} ${styles.previousButton}`}
                    disabled={activeIndex === 0}
                    onClick={previousStory}
                    aria-label="Story trước"
                >
                    ‹
                </button>

                {/* CHUYỂN STORY TIẾP THEO */}
                <button
                    type="button"
                    className={`${styles.navButton} ${styles.nextButton}`}
                    onClick={nextStory}
                    aria-label="Story tiếp theo"
                >
                    ›
                </button>
                </div>
        </div>
    )}
        </>
    );
}
