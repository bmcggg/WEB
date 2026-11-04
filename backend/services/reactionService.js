const { sql } = require('../config/database');
const VALID_TYPES = ['LIKE',  'HEART','LAUGH', 'WOW', 'SAD', 'ANGRY'];

function getTargetInfo(targetType) {
    const targets = {
        post: {  idColumn: 'post_id', table: 'posts',  name: 'bài viết'},
        comment: { idColumn: 'comment_id',table: 'comments',  name: 'bình luận'},
        story: { idColumn: 'story_id',  table: 'stories', name: 'Story'},
        message: { idColumn: 'message_id', table: 'messages', name: 'Message'}
    };
    return targets[targetType] || null;
}

function createError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

async function checkTargetExists(pool, targetType, targetId) {
    const target = getTargetInfo(targetType);

    if (!target) 
        throw createError(400, 'Loại đối tượng không hợp lệ.');
    
    let query = `SELECT id FROM ${target.table} WHERE id = @targetId`;

    if (targetType === 'story') 
        query += ` AND expires_at > SYSDATETIME()`;
    
    const result = await pool.request().input('targetId', sql.Int, targetId).query(query);

    if (result.recordset.length === 0) 
        throw createError( 404, `${target.name} không tồn tại hoặc đã hết hạn.`);

    return target;
}

async function getReactionStats(targetType, targetId, userId) {
    const target = getTargetInfo(targetType);

    if (!target) 
        throw createError(400, 'Loại đối tượng không hợp lệ.');
    
    const pool = await sql.connect();

    await checkTargetExists(pool, targetType, targetId);

    const statsResult = await pool.request()
        .input('targetId', sql.Int, targetId)
        .query(`SELECT type, COUNT(*) AS count
            FROM reactions WHERE ${target.idColumn} = @targetId  GROUP BY type`);

    const stats = {};
    let total = 0;

    statsResult.recordset.forEach(item => {
        const count = Number(item.count);
        stats[item.type] = count;
        total += count;
    });

    let userReaction = null;

    if (userId !== null && userId !== undefined) {
        const userResult = await pool.request()
            .input('targetId', sql.Int, targetId)
            .input('userId', sql.Int, userId)
            .query(` SELECT TOP 1 type FROM reactions WHERE ${target.idColumn} = @targetId  AND user_id = @userId`);

        userReaction = userResult.recordset[0]?.type ?? null;
    }

    return {
        total,
        stats,
        userReaction
    };
}

async function getReactionUsers(targetType, targetId) {
    const target = getTargetInfo(targetType);

    if (!target) 
        throw createError(400, 'Loại đối tượng không hợp lệ.');
    
    const pool = await sql.connect();

    await checkTargetExists(pool, targetType, targetId);

    const result = await pool.request()
        .input('targetId', sql.Int, targetId)
        .query(`SELECT r.user_id,  r.type, u.username,  u.full_name, u.avatar
            FROM reactions r
            INNER JOIN users u
                ON r.user_id = u.id
            WHERE r.${target.idColumn} = @targetId
            ORDER BY r.created_at DESC`);

    return result.recordset;
}

// Thêm, đổi hoặc gỡ reaction
async function toggleReaction({ userId, targetType, targetId, type}) {
    const target = getTargetInfo(targetType);

    if (!target||!VALID_TYPES.includes(type)) 
        throw createError(400, 'Loại đối tượng không hợp lệ.');

    const pool = await sql.connect();

    await checkTargetExists(pool, targetType, targetId);

    const existingResult = await pool.request()
        .input('targetId', sql.Int, targetId)
        .input('userId', sql.Int, userId)
        .query(` SELECT TOP 1 reaction_id, type FROM reactions  WHERE ${target.idColumn} = @targetId AND user_id = @userId`);

    const existing = existingResult.recordset[0];

    if (existing && existing.type === type) {
        await pool.request()
            .input('reactionId', sql.Int, existing.reaction_id)
            .query(` DELETE FROM reactions WHERE reaction_id = @reactionId`);

        return { userReaction: null,  message: 'Đã gỡ reaction.' };
    }

    // Đã reaction trước đó => đổi loại
    if (existing) {
        await pool.request()
            .input('reactionId', sql.Int, existing.reaction_id)
            .input('type', sql.NVarChar(20), type)
            .query(` UPDATE reactionsSET type = @type,  created_at = GETDATE() WHERE reaction_id = @reactionId`);

        return { userReaction: type, message: 'Đã cập nhật reaction.'};
    }

    // Chưa reaction => tạo mới
    const insertRequest = pool.request()
        .input('userId', sql.Int, userId)
        .input('type', sql.NVarChar(20), type);

    // Khởi tạo tất cả cột đối tượng là NULL
    // để mỗi reaction chỉ thuộc về một đối tượng.
    let insertQuery = `
        INSERT INTO reactions ( user_id, post_id, comment_id, message_id,story_id, type)
        VALUES ( @userId, @postId,  @commentId,  @messageId, @storyId,  @type )`;

    insertRequest.input('postId', sql.Int, targetType === 'post' ? targetId : null)
                .input('commentId', sql.Int, targetType === 'comment' ? targetId : null)
                .input('messageId', sql.Int, null)
                .input('storyId', sql.Int, targetType === 'story' ? targetId : null);

    await insertRequest.query(insertQuery);

    return { userReaction: type, message: 'Đã cập nhật reaction.'};
}

module.exports = {
    VALID_TYPES,
    getTargetInfo,
    getReactionStats,
    getReactionUsers,
    toggleReaction
};
