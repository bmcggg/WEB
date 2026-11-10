import { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import styles from './Comment.module.css';
import CommentList from './CommentList';
import CommentForm from './CommentForm';
import { fetchAPI } from '../services/api';

export default function Comment({ postId, currentUser }) {
    const [comments, setComments] = useState([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [deleteCommentId, setDeleteCommentId] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null);

    const loadComments = useCallback(async () => {
        try {
            const response = await fetchAPI(`/comments/post/${postId}`);

            setComments( response.data ?? response.comments ?? []);

            setError('');
        } catch (err) {
            console.error('Lỗi tải bình luận:', err);
            setError(err.message || 'Không thể tải bình luận.');
        }
    }, [postId]);

    useEffect(() => { loadComments(); }, [loadComments]);

    // Thêm bình luận
    const handleSubmit = async (event) => {
        event.preventDefault();

        const trimmedContent = content.trim();

        if ((!trimmedContent && selectedFiles.length === 0) ||loading)
            return;

        if (!currentUser?.id) {
            setError('Bạn cần đăng nhập để bình luận.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (selectedFiles.length > 0) {
                const formData = new FormData();

                formData.append('post_id', postId);
                formData.append('content', trimmedContent);
                formData.append('parent_comment_id',replyingTo?.id ?? '');

                selectedFiles.forEach((file) => { formData.append('media', file);});

                await fetchAPI('/comments', { method: 'POST',  body: formData });
            } 
            else {
                await fetchAPI('/comments', {
                    method: 'POST',
                    body: JSON.stringify({ post_id: postId, content: trimmedContent, parent_comment_id: replyingTo?.id ?? null})
                });
            }
            setContent('');
            setSelectedFiles([]);
            setReplyingTo(null);
            
            await loadComments();
        } catch (err) {
            console.error('Lỗi thêm bình luận:', err);

            setError( err.message || 'Không thể thêm bình luận.');
        } finally {
            setLoading(false);
        }
    };
    const handleReply = (comment) => {
        const name = comment.full_name || comment.username || 'Người dùng';

        setReplyingTo(comment);
        setContent(`@${name} `);
        setError('');
    };
    const cancelReply = () => {
        setReplyingTo(null);
        setContent('');
    };
    // Xóa bình luận
    const handleDelete = async () => {
        if (deleteCommentId === null || !currentUser?.id) 
            return;

        try {
            await fetchAPI(`/comments/${deleteCommentId}`, { method: 'DELETE' });

            setDeleteCommentId(null);

            await loadComments();
        } catch (err) {
            console.error('Lỗi xóa bình luận:', err);
            setError( err.message || 'Không thể xóa bình luận.');
        }
    };

    return (
        <div className={styles.commentSection}>
            {error && (
                <p role="alert" className={styles.actionError}> {error} </p>
            )}

        <CommentList
            comments={comments}
            currentUser={currentUser}
            onReply={handleReply}
            onDelete={(commentId) => {
                setDeleteCommentId(commentId);
                setError('');
            }}
        />

        {replyingTo && (
            <div className={styles.replyingNotice}>
                <span>
                    Đang trả lời{' '}
                    <strong>
                        {replyingTo.full_name || replyingTo.username || 'Người dùng'}
                    </strong>
                </span>

                <button type="button" onClick={cancelReply}>
                    Hủy
                </button>
            </div>
        )}

    <CommentForm
        content={content}
        setContent={setContent}
        loading={loading}
        currentUser={currentUser}
        onSubmit={handleSubmit}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        replyingTo={replyingTo}
        placeholder={
            replyingTo
                ? `Trả lời ${replyingTo.full_name || replyingTo.username || 'Người dùng'}...`
                : 'Viết bình luận...'
        }
    />
    {deleteCommentId !== null && (
        <Modal isOpen={true} onClose={() => setDeleteCommentId(null)} title="Xóa bình luận">
          <p>  Bạn có chắc muốn xóa bình luận này không? </p>
                <div className={styles.toolbar}>
                    <button type="button" onClick={() => setDeleteCommentId(null)}>
                        Hủy
                    </button>

                    <button type="button" className={styles.danger} onClick={handleDelete}>
                        Xác nhận xóa
                    </button>
                </div>
            </Modal>
            )}
        </div>
    );
}
