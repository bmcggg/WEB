const express = require('express');
const router = express.Router();
const { sql } = require('../config/database');

router.get('/post/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.query.userId; 
        const pool = await sql.connect();

      
        const statsQuery = await pool.request()
            .input('postId', sql.Int, postId)
            .query(`
                SELECT type, COUNT(*) as count 
                FROM reactions 
                WHERE post_id = @postId 
                GROUP BY type
            `);

        
        let userReaction = null;
        if (userId) {
            const userReactionQuery = await pool.request()
                .input('postId', sql.Int, postId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT type FROM reactions 
                    WHERE post_id = @postId AND user_id = @userId
                `);
            if (userReactionQuery.recordset.length > 0) {
                userReaction = userReactionQuery.recordset[0].type;
            }
        }

     
        const totalReactions = statsQuery.recordset.reduce((acc, curr) => acc + curr.count, 0);

        res.json({
            success: true,
            data: {
                total: totalReactions,
                stats: statsQuery.recordset,
                userReaction: userReaction
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


router.post('/toggle', async (req, res) => {
    try {
        const { post_id, user_id, type } = req.body;
        const pool = await sql.connect();

       
        const checkExisting = await pool.request()
            .input('post_id', sql.Int, post_id)
            .input('user_id', sql.Int, user_id)
            .query(`SELECT type FROM reactions WHERE post_id = @post_id AND user_id = @user_id`);

        if (checkExisting.recordset.length > 0) {
            const currentType = checkExisting.recordset[0].type;
            
            if (currentType === type) {
                
                await pool.request()
                    .input('post_id', sql.Int, post_id)
                    .input('user_id', sql.Int, user_id)
                    .query(`DELETE FROM reactions WHERE post_id = @post_id AND user_id = @user_id`);
                
                return res.json({ success: true, action: 'removed', userReaction: null });
            } else {
                
                await pool.request()
                    .input('post_id', sql.Int, post_id)
                    .input('user_id', sql.Int, user_id)
                    .input('type', sql.VarChar, type)
                    .query(`UPDATE reactions SET type = @type WHERE post_id = @post_id AND user_id = @user_id`);
                
                return res.json({ success: true, action: 'updated', userReaction: type });
            }
        } else {
          
            await pool.request()
                .input('post_id', sql.Int, post_id)
                .input('user_id', sql.Int, user_id)
                .input('type', sql.VarChar, type)
                .query(`INSERT INTO reactions (post_id, user_id, type) VALUES (@post_id, @user_id, @type)`);
            
            return res.json({ success: true, action: 'added', userReaction: type });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;