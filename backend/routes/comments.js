const express = require('express');
const router = express.Router();
const { sql } = require('../config/database');

router.get('/post/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const pool = await sql.connect();
        const result = await pool.request()
            .input('postId', sql.Int, postId)
            .query(`
                SELECT c.*, u.username, u.full_name, u.avatar_url 
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.post_id = @postId
                ORDER BY c.created_at ASC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { post_id, user_id, content } = req.body;
        const pool = await sql.connect();
        const result = await pool.request()
            .input('post_id', sql.Int, post_id)
            .input('user_id', sql.Int, user_id)
            .input('content', sql.NVarChar, content)
            .query(`
                INSERT INTO comments (post_id, user_id, content) 
                OUTPUT INSERTED.* 
                VALUES (@post_id, @user_id, @content)
            `);
        
        const newCommentId = result.recordset[0].id;
        const fullComment = await pool.request()
            .input('id', sql.Int, newCommentId)
            .query(`
                SELECT c.*, u.username, u.full_name, u.avatar_url 
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.id = @id
            `);

        res.json({ success: true, data: fullComment.recordset[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. Xóa bình luận
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect();
        await pool.request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM comments WHERE id = @id`);
        
        res.json({ success: true, message: 'Đã xóa bình luận thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;