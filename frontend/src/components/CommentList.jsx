import { Link } from 'react-router-dom';
import { assetUrl } from '../services/api';
import Reaction from './Reaction';
import styles from './Comment.module.css';
import CommentMedia from './CommentMedia';

// Chuyển danh sách bình luận phẳng thành cây phân cấp
function buildCommentTree(comments) {
    const commentMap = new Map();

    comments.forEach(comment => {commentMap.set(Number(comment.id), { ...comment, replies: [] });  });

    const roots = [];

    comments.forEach(comment => {
        const current = commentMap.get(Number(comment.id));
        const parentId = comment.parent_comment_id;

        const parent = parentId != null ? commentMap.get(Number(parentId)) : null;

        if (parent) 
            parent.replies.push(current);
        else 
            roots.push(current);
    });

    return roots;
}

export default function CommentList({ comments, currentUser, onDelete, onReply}) {
    const commentTree = buildCommentTree(comments);

    // Hiển thị một bình luận và các câu trả lời của nó
    const renderComment = (cmt) => {
        const name = cmt.full_name || cmt.username || 'Người dùng';

        return (
            <div className={styles.commentItem} key={cmt.id}>
                {/* Avatar */}
                <Link to={'/profile?id=' + cmt.user_id} className={styles.avatarLink}aria-label={'Trang cá nhân ' + name}>
                    <div className={styles.avatar}
                        style={ cmt.avatar ? { backgroundImage: 'url("' + assetUrl(cmt.avatar) + '")' } : {}}>
                        {!cmt.avatar && name.charAt(0).toUpperCase()}
                    </div>
                </Link>

                <div className={styles.commentMain}>
                    {/* Nội dung bình luận */}
                    <div className={styles.commentBubble}>
                        <Link to={'/profile?id=' + cmt.user_id} className={styles.commentAuthor} >
                            {name}
                        </Link>

                        <div className={styles.commentContent}>
                            {cmt.content}
                        </div>

                        {/* Media */}
                        {cmt.media?.length > 0 && (
                            <div className={styles.commentMediaList}>
                                {cmt.media.map(media => (
                                    <CommentMedia
                                        key={media.id}
                                        media={media}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Các nút thao tác */}
                    <div className={styles.commentActions}>
                        <Reaction
                            targetType="comment"
                            targetId={cmt.id}
                            currentUser={currentUser}
                        />

                        <button
                            type="button"
                            className={styles.replyButton}
                            onClick={() => onReply(cmt)}
                        >
                            Trả lời
                        </button>

                        {currentUser?.id != null && Number(currentUser.id) === Number(cmt.user_id) && (
                                <button  type="button" className={styles.deleteButton}
                                    onClick={() => onDelete(cmt.id)}>
                                    Xóa
                                </button>
                        )}
                    </div>

                    {/* Các bình luận trả lời */}
                    {cmt.replies.length > 0 && (
                        <div className={styles.replyList}>
                            {cmt.replies.map(reply =>  renderComment(reply) )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.commentList}>
            {commentTree.map(comment =>  renderComment(comment))}
        </div>
    );
}