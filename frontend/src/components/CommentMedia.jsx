import { useEffect, useState } from 'react';
import { fetchAPI } from '../services/api';
import { acquireMedia } from '../services/media';
import styles from './Comment.module.css';

export default function CommentMedia({ media }) {
    const [source, setSource] = useState('');
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!media?.media_url) return;

        let active = true;
        let resource = null;
        let objectUrl = null;

        setSource('');
        setError('');

        const loadMedia = async () => {
            try {
                // Ảnh: sử dụng cơ chế tải media hiện tại
                if (media.media_type === 'IMAGE') {
                    resource = acquireMedia(media.media_url);

                    const url = await resource.promise;

                    if (active) 
                        setSource(url);
                }
                // Video: tải dữ liệu qua API để hỗ trợ xác thực
                else if (media.media_type === 'VIDEO') {
                    const blob = await fetchAPI( media.media_url, { responseType: 'blob' });

                    if (!active) return;

                    objectUrl = URL.createObjectURL(blob);
                    setSource(objectUrl);
                }
            } catch (failure) {
                if (active && failure.name !== 'AbortError') 
                    setError(failure.message || 'Không thể tải tệp media.');
            }
        };

        loadMedia();

        return () => {
            active = false;

            if (resource) 
                resource.release();

            if (objectUrl) 
                URL.revokeObjectURL(objectUrl);
        };
    }, [media?.media_url, media?.media_type, attempt]);

    // Không hỗ trợ loại media khác
    if (!media || !['IMAGE', 'VIDEO'].includes(media.media_type)) 
        return null;

    // Hiển thị lỗi
    if (error) {
        return (
            <div className={styles.commentMediaError}>
                <span>{error}</span>

                <button
                    type="button"
                    onClick={() => { setError(''); setSource(''); setAttempt((value) => value + 1); }}
                >
                    Thử lại
                </button>
            </div>
        );
    }

    // Hiển thị trạng thái tải
    if (!source) {
        return (
            <div  className={styles.commentMediaPlaceholder} role="status"
            >
                Đang tải {media.media_type === 'IMAGE' ? 'ảnh' : 'video'}…
            </div>
        );
    }

    // Hiển thị ảnh
    if (media.media_type === 'IMAGE') {
        return (
            <img className={styles.commentMediaImage} src={source}
                alt="Ảnh đính kèm bình luận" loading="lazy"
            />
        );
    }

    // Hiển thị video
    return (
        <video className={styles.commentMediaVideo}  src={source} controls
            playsInline  preload="metadata"
        >
            Trình duyệt của bạn không hỗ trợ phát video.
        </video>
    );
}