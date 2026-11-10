const fs = require('node:fs/promises');
const path = require('node:path');
const commentService = require('../services/commentService');
const postService = require('../services/postService');
const { validateFiles } = require('../utils/postUpload');
const { filePath, removeFiles } = require('../utils/postFiles');
const { HttpError, positiveInteger } = require('../utils/postValidation');

exports.getCommentsByPost = async (req, res) => {
    try {
        const postId = positiveInteger(req.params.postId, 'Post ID');
        const comments = await commentService.getCommentsByPost( postId, req.user.id);

        return res.json({ success: true, data: comments});
    } catch (err) {
        console.error('Lỗi tải bình luận:', err);

        return res.status(err.status || 500).json({
            success: false,  message: err.message || 'Lỗi tải bình luận.'});
    }
};

// Toggle reaction
exports.toggleReaction = async (req, res) => {
    try {
        await commentService.toggleReaction();

        return res.json({ success: true,  message: 'Đã cập nhật reaction.'});
    } catch (err) {
        console.error('Lỗi toggle reaction:', err);

        return res.status(err.status || 500).json({
            success: false, message: err.message || 'Lỗi reaction.'});
    }
};


exports.createComment = async (req, res) => {
    const files = req.files || [];

    try {
        const input = { post_id: req.body?.post_id, user_id: req.user.id,
        content: req.body?.content, parent_comment_id: req.body?.parent_comment_id || null};

        const media = await validateFiles(files);
        const comment = await commentService.createComment({ ...input, media });

        return res.status(201).json({ success: true, data: comment});
    } catch (err) {
       
        try {
            await removeFiles(
                files.map(file => `posts/${file.filename}`)
            );
        } catch (cleanupError) {
            console.error( 'Comment upload cleanup failed:',  cleanupError.code || 'IO_ERROR');
        }

        console.error('Lỗi thêm bình luận:', err);

        return res.status(err.status || 500).json({ success: false,  message: err.message || 'Lỗi thêm bình luận.'});
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const id = positiveInteger(req.params.id, 'Comment ID');
        const mediaKeys = await commentService.deleteComment( id,  req.user.id);

        let cleanupPending = false;

        try {
            const removableFiles = await postService.unreferencedFiles(mediaKeys);

            cleanupPending = await removeFiles(removableFiles);
        } catch (cleanupError) {
            cleanupPending = true;

            // Không xóa file nếu chưa xác định được file còn được sử dụng hay không
            console.error(
                'Comment deleted; media cleanup pending:',  cleanupError.code || 'CLEANUP_ERROR' );
        }

        return res.json({ success: true, message: 'Đã xóa bình luận thành công.', cleanupPending});
    } catch (err) {
        console.error('Lỗi xóa bình luận:', err);

        return res.status(err.status || 500).json({
            success: false,  message: err.message || 'Lỗi xóa bình luận.'});
    }
};

exports.getMedia = async (req, res) => {
    try {
        const commentId = positiveInteger(req.params.id, 'Comment ID');
        const mediaId = positiveInteger(req.params.mediaId, 'Media ID');
        const media = await commentService.getMedia(  commentId, mediaId, req.user.id );
        const target = filePath(media.media_url);

        if (!target) 
            throw new HttpError(404, 'Không tìm thấy file.');
        
        try {
            const info = await fs.lstat(target);

            if (!info.isFile() || info.isSymbolicLink()) 
                throw new HttpError(404, 'Không tìm thấy file.');
            
        } catch (error) {
            if (error.code === 'ENOENT') 
                throw new HttpError(404, 'Không tìm thấy file.');

            throw error;
        }

        res.set({
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; sandbox"
        });

        const disposition = ['IMAGE', 'VIDEO', 'AUDIO'].includes(media.media_type) ? 'inline': 'attachment';

        res.set('Content-Disposition', `${disposition}; filename="${path.basename(target)}"`);

        return res.sendFile(
            target,
            {
                cacheControl: false,  lastModified: false, dotfiles: 'deny'},
            error => {
                if (error && !res.headersSent) 
                    res.status(error.code === 'ENOENT' ? 404 : 500).end();
            }
        );
    } catch (err) {
        console.error('Lỗi lấy media bình luận:', err);

        if (!res.headersSent) 
            return res.status(err.status || 500).json({
                success: false,  message: err.message || 'Lỗi tải file.'});
    }
};