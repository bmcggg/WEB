const db = require('../config/database');
const sql = db.sql || db;

class PostService {
    async getAllPosts() {
        const request = new sql.Request();
        const result = await request.query(`
            SELECT 
                posts.id,
                posts.user_id,
                posts.content,
                posts.privacy,
                posts.created_at,
                posts.updated_at,
                users.username, 
                users.full_name,
                users.avatar
            FROM posts 
            JOIN users ON posts.user_id = users.id 
            ORDER BY posts.created_at DESC
        `);
        return result.recordset;
    }

    async createPost(userId, content, privacy) {
        const request = new sql.Request();
        request.input('user_id', sql.Int, userId);
        request.input('content', sql.NVarChar, content);
        request.input('privacy', sql.VarChar, privacy || 'PUBLIC');

        const result = await request.query(`
            INSERT INTO posts (user_id, content, privacy)
            OUTPUT INSERTED.id
            VALUES (@user_id, @content, @privacy)
        `);
        return result.recordset[0].id;
    }

    async getPostsByUserId(userId) {
        const request = new sql.Request();
        request.input('userId', sql.Int, userId);

        const result = await request.query(`
            SELECT p.id, p.content, p.created_at, p.user_id, u.username, u.full_name, u.avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = @userId
            ORDER BY p.created_at DESC
        `);
        return result.recordset;
    }
}

module.exports = new PostService();