const fs = require('node:fs/promises');
const { sql } = require('../config/database');
const { HttpError, positiveInteger } = require('../utils/postValidation');
const visible = "(p.privacy = 'PUBLIC' OR p.user_id = @viewer)";

function mediaUrl(commentId, mediaId) {
    return `/api/comments/${commentId}/media/${mediaId}`;
}

function attachMedia(comments, media) {
    const grouped = new Map();

    for (const item of media) {
        const values = grouped.get(item.comment_id) || [];

        values.push({ id: item.id, comment_id: item.comment_id, media_type: item.media_type, media_url: mediaUrl(item.comment_id, item.id), display_order: item.display_order});

        grouped.set(item.comment_id, values);
    }

    return comments.map(comment => ({ ...comment, media: grouped.get(comment.id) || [] }));
}

class CommentService {
    async getCommentByIdWithMedia(commentId) {
        const id = positiveInteger(commentId, 'Comment ID');
        const pool = await sql.connect();

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT c.*, u.username, u.full_name,  u.avatar
                FROM comments c
                JOIN users u ON u.id = c.user_id
                WHERE c.id = @id;

                SELECT cm.id, cm.comment_id, cm.media_type, cm.display_order
                FROM comment_media cm
                WHERE cm.comment_id = @id
                ORDER BY cm.display_order ASC, cm.id ASC;
            `);

        const comment = result.recordsets[0][0];

        if (!comment) return null;

        return attachMedia( [comment], result.recordsets[1])[0];
    }

    async getCommentsByPost(postId, viewerId) {
        const id = positiveInteger(postId, 'Post ID');
        const viewer = positiveInteger(viewerId, 'User ID');
        const pool = await sql.connect();

        const result = await pool.request()
            .input('postId', sql.Int, id)
            .input('viewer', sql.Int, viewer)
            .query(`
                SELECT  c.*, u.username,   u.full_name,  u.avatar
                FROM comments c
                JOIN users u ON u.id = c.user_id
                JOIN posts p ON p.id = c.post_id
                WHERE c.post_id = @postId
                    AND ${visible}
                ORDER BY c.created_at ASC, c.id ASC;

                SELECT
                    cm.id, cm.comment_id,  cm.media_type, cm.display_order
                FROM comment_media cm
                JOIN comments c ON c.id = cm.comment_id
                JOIN posts p ON p.id = c.post_id
                WHERE c.post_id = @postId
                    AND ${visible}
                ORDER BY cm.display_order ASC, cm.id ASC;
            `);

        return attachMedia(  result.recordsets[0], result.recordsets[1]);
    }

    // Tạo bình luận và lưu media
    async createComment({ post_id, user_id, content, media = [], parent_comment_id = null}) 
    {
    const postId = positiveInteger(post_id, 'Post ID');
    const userId = positiveInteger(user_id, 'User ID');

    const parentCommentId = parent_comment_id == null || parent_comment_id === '' ? null: positiveInteger(parent_comment_id, 'Parent Comment ID');

        if (content == null) content = '';

        if (typeof content !== 'string' || content.length > 10000) 
            throw new HttpError(400, 'Nội dung bình luận không hợp lệ.');
        

        const trimmedContent = content.trim();

        if (!Array.isArray(media)) 
            throw new HttpError(400, 'Danh sách media không hợp lệ.');
        

        if (!trimmedContent && media.length === 0) 
            throw new HttpError(400, 'Vui lòng nhập nội dung hoặc chọn file.');
        

        const pool = await sql.connect();
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        try {
            // Kiểm tra bài viết và quyền xem bài viết
            const postResult = await new sql.Request(transaction)
                .input('postId', sql.Int, postId)
                .input('viewer', sql.Int, userId)
                .query(`  SELECT id  FROM posts p
                    WHERE p.id = @postId AND ${visible}`);

            if (!postResult.recordset.length) 
                throw new HttpError(404, 'Không tìm thấy bài viết.');
            

            
            const commentResult = await new sql.Request(transaction)
                 .input('postId', sql.Int, postId)
                .input('userId', sql.Int, userId)
                .input('content', sql.NVarChar(sql.MAX), trimmedContent)
                .input('parentCommentId', sql.Int, parentCommentId)
                .query(`
                    INSERT INTO comments ( post_id, user_id, parent_comment_id, content)
                    OUTPUT INSERTED.id
                    VALUES ( @postId,  @userId, @parentCommentId, @content);`);

            const commentId = commentResult.recordset[0].id;

        
           for (const item of media) {
                await new sql.Request(transaction)
                            .input('commentId', sql.Int, commentId)
                            .input('mediaUrl', sql.NVarChar(sql.MAX), item.media_url)
                            .input('mediaType', sql.NVarChar(20), item.media_type)
                            .input('displayOrder', sql.Int, item.display_order)
                            .query(`
                                INSERT INTO comment_media (comment_id, media_url, media_type, display_order)

                                VALUES ( @commentId, @mediaUrl, @mediaType, @displayOrder)`);
    
            if (parentCommentId !== null) {
                const parentResult = await new sql.Request(transaction)
                    .input('parentCommentId', sql.Int, parentCommentId)
                    .input('postId', sql.Int, postId)
                    .input('viewer', sql.Int, userId)
                    .query(` SELECT c.id
                            FROM comments c
                            INNER JOIN posts p ON p.id = c.post_id
                            WHERE c.id = @parentCommentId
                                AND c.post_id = @postId
                                AND ${visible};`);

            if (!parentResult.recordset.length) 
                throw new HttpError( 404,'Không tìm thấy bình luận cần trả lời.');
        }
    }

            await transaction.commit();

            return await this.getCommentByIdWithMedia(commentId);
            } catch (error) {
                await transaction.rollback().catch(rollbackError => {
                    console.error('Lỗi rollback comment:', rollbackError);
                });

            throw error;
        }
    }

  
    async deleteComment(commentId, userId) {
        const id = positiveInteger(commentId, 'Comment ID');
        const viewerId = positiveInteger(userId, 'User ID');
        const pool = await sql.connect();
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        try {
            const commentResult = await new sql.Request(transaction)
                .input('id', sql.Int, id)
                .query(`SELECT id, user_id FROM comments WITH (UPDLOCK, HOLDLOCK) WHERE id = @id`);

            const comment = commentResult.recordset[0];

            if (!comment) 
                throw new HttpError(404, 'Không tìm thấy bình luận.');

            if (Number(comment.user_id) !== viewerId) 
                throw new HttpError(403, 'Bạn không có quyền xóa bình luận này.');

            const mediaResult = await new sql.Request(transaction)
                .input('commentId', sql.Int, id)
                .query(`SELECT media_url
                        FROM comment_media
                        WHERE comment_id = @commentId;`);

            const mediaKeys = mediaResult.recordset.map(item => item.media_url);

            await new sql.Request(transaction)
                .input('commentId', sql.Int, id)
                .query(`DELETE FROM reactions WHERE comment_id = @commentId;`);

            
            await new sql.Request(transaction)
                        .input('id', sql.Int, id)
                        .query(` UPDATE comments
                            SET parent_comment_id = NULL
                            WHERE parent_comment_id = @id;`);


    await new sql.Request(transaction)
        .input('id', sql.Int, id)
        .query(` DELETE FROM comments WHERE id = @id;`);
                await transaction.commit();

                return mediaKeys;
            } catch (error) {
                await transaction.rollback().catch(rollbackError => {
                    console.error('Lỗi rollback comment:', rollbackError);
                });

                throw error;
            }
        }

    
    async getMedia(commentId, mediaId, viewerId) {
        const id = positiveInteger(commentId, 'Comment ID');
        const fileId = positiveInteger(mediaId, 'Media ID');
        const viewer = positiveInteger(viewerId, 'User ID');
        const pool = await sql.connect();

        const result = await pool.request()
            .input('commentId', sql.Int, id)
            .input('mediaId', sql.Int, fileId)
            .input('viewer', sql.Int, viewer)
            .query(` SELECT cm.media_url, cm.media_type
                FROM comment_media cm
                JOIN comments c ON c.id = cm.comment_id
                JOIN posts p ON p.id = c.post_id
                WHERE c.id = @commentId
                    AND cm.id = @mediaId
                    AND ${visible}; `);

        if (!result.recordset.length) 
            throw new HttpError(404, 'Không tìm thấy file.');

        return result.recordset[0];
    }

    async toggleReaction() {
        throw new HttpError( 501, 'Chức năng reaction cho bình luận chưa được triển khai.' );
    }
}

module.exports = new CommentService();