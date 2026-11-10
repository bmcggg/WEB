import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../services/api';
import { Link } from 'react-router-dom';
import styles from './Comment.module.css';

export default function CommentForm({ content,  setContent, loading, currentUser, onSubmit, selectedFiles = [],  setSelectedFiles, placeholder = 'Viết bình luận...', replyingTo}) {
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const [previews, setPreviews] = useState([]);

    useEffect(() => {
        if (replyingTo) {
            textareaRef.current?.focus();

            textareaRef.current?.scrollIntoView({  behavior: 'smooth',  block: 'center' });
        }}, [replyingTo]);

    // Tạo URL xem trước ảnh/video
    useEffect(() => {
        const urls = selectedFiles.map((file) => ({ file, url: URL.createObjectURL(file)}));

        setPreviews(urls);

        return () => { urls.forEach((item) => URL.revokeObjectURL(item.url));};
    }, [selectedFiles]);

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files || []);

        if (setSelectedFiles) 
            setSelectedFiles((current) => [ ...current, ...files ]);

        event.target.value = '';
    };

    // Xóa file đã chọn
    const removeFile = (index) => {
        setSelectedFiles((current) => current.filter((_, i) => i !== index));
    };

    // Enter để gửi, Shift + Enter để xuống dòng
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
        }
    };

    const name =  currentUser?.full_name || currentUser?.username || 'Người dùng';

    const currentUserId = typeof currentUser === 'object' ? currentUser?.id : currentUser;

    const avatarUrl = currentUser?.avatar ? ( currentUser.avatar.startsWith('http') ? currentUser.avatar  : assetUrl(currentUser.avatar)): null;

    return (
        <form className={styles.commentForm} onSubmit={onSubmit}>
            <Link to={'/profile?id=' + currentUserId} className={styles.avatarLink} aria-label={'Trang cá nhân ' + name}>
                {avatarUrl ? (  <img src={avatarUrl} alt={name} className={styles.avatar}/>) 
                : ( <div className={styles.avatar}>
                        {name.charAt(0).toUpperCase()}
                    </div>
                )}
            </Link>

            <div className={styles.commentFormMain}>
                {previews.length > 0 && (
                    <div className={styles.commentPreviewList}>
                        {previews.map((item, index) => (
                            <div className={styles.commentPreviewItem} key={index}>
                                {item.file.type.startsWith('image/') ? (
                                    <img src={item.url} alt={item.file.name} />
                                ) : item.file.type.startsWith('video/') ? (
                                    <video src={item.url}  muted controls />
                                ) : null}

                                <button  type="button" className={styles.removePreview}
                                    onClick={() => removeFile(index)} aria-label="Xóa tệp đính kèm">
                                         X
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.commentInputWrapper}>
                    <textarea
                        ref={textareaRef}
                        className={styles.commentInput}
                        value={content}
                        onChange={(event) =>
                            setContent(event.target.value)
                        }
                        placeholder={placeholder}
                        rows={1}
                        onKeyDown={handleKeyDown}
                    />

                    <input ref={fileInputRef} type="file"
                        accept="image/*,video/*"  multiple hidden  onChange={handleFileChange}
                     />

                    <button
                        type="button"
                        className={styles.attachButton}
                        title="Đính kèm ảnh hoặc video"
                        aria-label="Đính kèm ảnh hoặc video"
                        disabled={loading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        +
                    </button>
                </div>
            </div>

            <button
                className={styles.sendButton}
                type="submit"
                disabled={
                    loading ||
                    (!content.trim() && selectedFiles.length === 0)
                }
            >
                {loading ? 'Đang gửi...' : 'Gửi'}
            </button>
        </form>
    );
}