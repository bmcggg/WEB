const fs = require('node:fs/promises');
const path = require('node:path');
const storyService = require('../services/storyService');
const { validateFiles } = require('../utils/postUpload');
const { filePath, removeFiles } = require('../utils/postFiles');
const { HttpError, positiveInteger } = require('../utils/postValidation');

exports.createStory = async (req, res) => {
    const files = req.files || [];

    try {
        if (files.length !== 1) 
            throw new HttpError(400, 'Mỗi lần chỉ được đăng một ảnh hoặc video Story.');
        
        const media = await validateFiles(files);
        if ( media.length !== 1 || !['IMAGE', 'VIDEO'].includes(media[0].media_type)) 
            throw new HttpError( 415, 'Story chỉ hỗ trợ ảnh hoặc video.');
        
        const story = await storyService.createStory( req.user.id, media[0]);

        return res.status(201).json({
            success: true, message: 'Đăng Story thành công.', data: story });

    } catch (err) {
        try {
            await removeFiles( files.map(file => `posts/${file.filename}`));
        } catch (cleanupError) {
            console.error( 'Story upload cleanup failed:', cleanupError.code || 'IO_ERROR');
        }
        console.error('Lỗi đăng Story:', err);

        return res.status(err.status || 500).json({
            success: false, message: err.message || 'Không thể đăng Story.'});
    }
};

exports.getStories = async (req, res) => {
    try {
        const stories = await storyService.getStories(req.user.id);

        return res.json({ success: true, data: stories});
    } catch (err) {
        console.error('Lỗi lấy danh sách Story:', err);

        return res.status(err.status || 500).json({
            success: false, message: err.message || 'Không thể tải Story.'});
    }
};


exports.getMedia = async (req, res) => {
    try {
        const storyId = positiveInteger(req.params.id, 'Story ID');
        const media = await storyService.getStoryMedia( storyId, req.user.id);
        const target = filePath(media.media_url);

        if (!target) 
            throw new HttpError(404, 'Không tìm thấy file Story.');
    
        try {
            const info = await fs.lstat(target);

            if (!info.isFile() || info.isSymbolicLink()) 
                throw new HttpError(404, 'Không tìm thấy file Story.');

        } catch (error) {
            if (error.code === 'ENOENT') 
                throw new HttpError(404, 'Không tìm thấy file Story.');

            throw error;
        }

        res.set({
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; sandbox",
            'Content-Disposition':
                `inline; filename="${path.basename(target)}"`
        });

        return res.sendFile(
            target,
            { cacheControl: false, lastModified: false,  dotfiles: 'deny'},
            error => {
                if (error && !res.headersSent) 
                  res.status( error.code === 'ENOENT' ? 404 : 500).end();
                
            }
        );

    } catch (err) {
        console.error('Lỗi lấy media Story:', err);

        if (!res.headersSent) 
            return res.status(err.status || 500).json({
                success: false, message: err.message || 'Không thể tải Story.'});
    }
};


exports.deleteStory = async (req, res) => {
    try {
        const storyId = positiveInteger( req.params.id, 'Story ID');

        // Service chỉ xóa nếu Story thuộc về người đang đăng nhập
        const deletedStory = await storyService.deleteStory( storyId, req.user.id);

        // Xóa file ảnh/video sau khi xóa bản ghi SQL thành công
        try {
            await removeFiles([deletedStory.media_url]);
        } catch (cleanupError) {
            console.error('Story media cleanup failed:', cleanupError.code || cleanupError.message);
        }
        return res.json({
            success: true, message: 'Xóa Story thành công.',
            data: {
                id: deletedStory.id
            }
        });

    } catch (err) {
        console.error('Lỗi xóa Story:', err);

        return res.status(err.status || 500).json({
            success: false, message: err.message || 'Không thể xóa Story.'
        });
    }
};
