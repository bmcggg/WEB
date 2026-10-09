const { sql } = require('../config/database');

class AuthService {
    async findUserByUsernameOrEmail(account) {
        const request = new sql.Request();
        request.input('account', sql.VarChar, account);
        const result = await request.query(`
            SELECT * FROM users WHERE username = @account OR email = @account
        `);
        return result.recordset[0];
    }

    async checkExistingUser(username, email) {
        const checkRequest = new sql.Request();
        checkRequest.input('username', sql.VarChar, username);
        checkRequest.input('email', sql.VarChar, email);

        const checkResult = await checkRequest.query(`
            SELECT id FROM users WHERE username = @username OR email = @email
        `);
        return checkResult.recordset.length > 0;
    }

    async createUser(username, email, hashedPassword, full_name) {
        const insertRequest = new sql.Request();
        insertRequest.input('username', sql.VarChar, username);
        insertRequest.input('email', sql.VarChar, email);
        insertRequest.input('password', sql.VarChar, hashedPassword);
        insertRequest.input('full_name', sql.NVarChar, full_name);

        const result = await insertRequest.query(`
            INSERT INTO users (username, email, password, full_name)
            OUTPUT INSERTED.id
            VALUES (@username, @email, @password, @full_name)
        `);
        return result.recordset[0].id;
    }

    async updateAvatar(userId, avatarUrl) {
        const pool = await sql.connect();
        await pool.request()
            .input('avatar', sql.NVarChar, avatarUrl)
            .input('id', sql.Int, userId)
            .query('UPDATE Users SET avatar = @avatar WHERE id = @id');
    }

    async getUserProfile(userId) {
        const request = new sql.Request();
        request.input('id', sql.Int, userId);

        const result = await request.query(`
            SELECT 
                u.id, u.username, u.full_name, u.email, u.avatar, u.bio,
                (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS posts_count,
                0 AS followers_count,
                0 AS following_count
            FROM users u
            WHERE u.id = @id
        `);
        return result.recordset[0];
    }
}

module.exports = new AuthService();