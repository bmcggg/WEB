const postService = require('../services/postService');

class PostController {
    async getAllPosts(req, res) {
        try {
            const posts = await postService.getAllPosts();
            res.json({ data: posts, posts: posts });
        } catch (err) {
            console.error('Lỗi GET /api/posts:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async createPost(req, res) {
        const { user_id, content, privacy } = req.body;

        if (!user_id || !content) {
            return res.status(400).json({ error: 'Nội dung không được để trống!' });
        }

        try {
            const newPostId = await postService.createPost(user_id, content, privacy);
            res.status(201).json({
                message: 'Đăng bài thành công!',
                postId: newPostId
            });
        } catch (err) {
            console.error('Lỗi POST /api/posts:', err);
            res.status(500).json({ error: err.message });
        }
    }

    async getUserPosts(req, res) {
        try {
            const userId = req.params.id;
            const posts = await postService.getPostsByUserId(userId);
            res.json({ data: posts });
        } catch (err) {
            console.error('Lỗi GET user posts:', err);
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new PostController();