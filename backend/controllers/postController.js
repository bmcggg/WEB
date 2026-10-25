const fs = require('node:fs/promises');
const path = require('node:path');
const postService = require('../services/postService');
const { positiveInteger, pagination, postInput, HttpError } = require('../utils/postValidation');
const { validateFiles } = require('../utils/postUpload');
const { filePath, removeFiles, queueCleanup } = require('../utils/postFiles');

class PostController {
    async getAllPosts(req, res) {
        const result = await postService.list(req.user.id, pagination(req.query));
        res.json({ ...result, posts: result.data });
    }

    async getUserPosts(req, res) {
        const userId = positiveInteger(req.params.id, 'User ID');
        res.json(await postService.list(req.user.id, pagination(req.query), { userId }));
    }

    async getSavedPosts(req, res) {
        res.json(await postService.list(req.user.id, pagination(req.query), { saved: true }));
    }

    async getPost(req, res) {
        res.json({ data: await postService.getPost(positiveInteger(req.params.id, 'Post ID'), req.user.id) });
    }

    async createPost(req, res) {
        const files = req.files || [];
        let post;
        try {
            const input = postInput(req.body, { hasMedia: files.length > 0 });
            const media = await validateFiles(files);
            post = await postService.createPost(req.user.id, input, media);
        } catch (error) {
            try {
                await removeFiles(files.map((file) => 'posts/' + file.filename));
            } catch (cleanupError) {
                console.error('Failed to clean request files:', cleanupError.code || 'IO_ERROR');
            }
            throw error;
        }
        res.status(201).json({ postId: post.id, data: post });
    }

    async updatePost(req, res) {
        const input = postInput(req.body, { patch: true });
        res.json({ data: await postService.updatePost(positiveInteger(req.params.id, 'Post ID'), req.user.id, input) });
    }

    async deletePost(req, res) {
        const keys = await postService.deletePost(positiveInteger(req.params.id, 'Post ID'), req.user.id);
        let cleanupPending = false;
        try {
            cleanupPending = await removeFiles(await postService.unreferencedFiles(keys));
        } catch (error) {
            cleanupPending = true;
            console.error('Post deleted; file cleanup pending:', error.code || 'CLEANUP_ERROR');
            await queueCleanup(keys).catch(() => console.error('Could not persist cleanup queue; inspect storage manually.'));
        }
        res.json({ deleted: true, cleanupPending });
    }

    async savePost(req, res) {
        await postService.savePost(positiveInteger(req.params.id, 'Post ID'), req.user.id);
        res.json({ is_saved: true });
    }

    async unsavePost(req, res) {
        await postService.unsavePost(positiveInteger(req.params.id, 'Post ID'), req.user.id);
        res.json({ is_saved: false });
    }

    async getMedia(req, res, next) {
        const media = await postService.getMedia(positiveInteger(req.params.id, 'Post ID'), positiveInteger(req.params.mediaId, 'Media ID'), req.user.id);
        const target = filePath(media.media_url);
        if (!target) throw new HttpError(404, 'Khong tim thay tep.');
        try {
            const info = await fs.lstat(target);
            if (!info.isFile() || info.isSymbolicLink()) throw new HttpError(404, 'Khong tim thay tep.');
        } catch (error) {
            if (error.code === 'ENOENT') throw new HttpError(404, 'Khong tim thay tep.');
            throw error;
        }
        res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" });
        res.set('Content-Disposition', (media.media_type === 'IMAGE' ? 'inline' : 'attachment') + '; filename="' + path.basename(target) + '"');
        res.sendFile(target, { cacheControl: false, lastModified: false, dotfiles: 'deny' }, (error) => {
            if (error) next(error.code === 'ENOENT' ? new HttpError(404, 'Khong tim thay tep.') : error);
        });
    }
}

module.exports = new PostController();
