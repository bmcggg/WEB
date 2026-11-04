const { sql } = require('../config/database');

function createError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function validateId(value, fieldName = 'ID') {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0)
        throw createError(400, `${fieldName} không hợp lệ.`);

    return id;
}


async function createStory(userId, media) {
    userId = validateId(userId, 'User ID');

    if (!media || !['IMAGE', 'VIDEO'].includes(media.media_type)) 
        throw createError(400, 'Story chỉ hỗ trợ ảnh hoặc video.');
    
    const pool = await sql.connect();

    const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('mediaType', sql.NVarChar(20), media.media_type)
        .input('mediaUrl', sql.NVarChar(sql.MAX), media.media_url)
        .query(`
            INSERT INTO stories ( user_id, media_type, media_url, expires_at)
            OUTPUT
                INSERTED.id,
                INSERTED.user_id,
                INSERTED.media_type,
                INSERTED.created_at,
                INSERTED.expires_at
            VALUES ( @userId, @mediaType, @mediaUrl,  DATEADD(HOUR, 24, SYSDATETIME()));
        `);

    const story = result.recordset[0];

    return {
        ...story,
        media_url: `/api/stories/${story.id}/media`
    };
}


async function getStories(viewerId) {
    viewerId = validateId(viewerId, 'User ID');

    const pool = await sql.connect();

    const result = await pool.request()
        .input('viewerId', sql.Int, viewerId)
        .query(`
            SELECT  s.id, s.user_id, s.media_type, s.created_at,  s.expires_at,
                u.username, u.full_name, u.avatar
            FROM stories s
            INNER JOIN users u
                ON u.id = s.user_id
            WHERE
                s.expires_at > SYSDATETIME()
            ORDER BY
                CASE WHEN s.user_id = @viewerId THEN 0 ELSE 1 END,
                s.created_at ASC;
        `);

    const grouped = new Map();

    for (const story of result.recordset) {
        if (!grouped.has(story.user_id)) {
            grouped.set(story.user_id, {
                user_id: story.user_id, username: story.username,
                full_name: story.full_name, avatar: story.avatar, stories: []
            });
        }

        grouped.get(story.user_id).stories.push({
            id: story.id,
            media_type: story.media_type,
            media_url: `/api/stories/${story.id}/media`,
            created_at: story.created_at,
            expires_at: story.expires_at
        });
    }
    return Array.from(grouped.values());
}


async function getStoryMedia(storyId, viewerId) {
    storyId = validateId(storyId, 'Story ID');
    viewerId = validateId(viewerId, 'User ID');

    const pool = await sql.connect();

    const result = await pool.request()
        .input('storyId', sql.Int, storyId).input('viewerId', sql.Int, viewerId)
        .query(`
            SELECT s.id, s.user_id, s.media_type, s.media_url, s.expires_at
            FROM stories s
            WHERE
                s.id = @storyId
                AND s.expires_at > SYSDATETIME();
        `);

    if (!result.recordset.length) 
        throw createError(404, 'Story không tồn tại hoặc đã hết hạn.');

    return result.recordset[0];
}

async function deleteStory(storyId, userId) {
    storyId = validateId(storyId, 'Story ID');
    userId = validateId(userId, 'User ID');

    const pool = await sql.connect();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
        // Kiểm tra Story có tồn tại và thuộc người đăng nhập không
        const checkResult = await new sql.Request(transaction)
            .input('storyId', sql.Int, storyId)
            .input('userId', sql.Int, userId)
            .query(`
                SELECT id, user_id, media_url
                FROM stories
                WHERE id = @storyId
                  AND user_id = @userId;
            `);

        if (!checkResult.recordset.length) 
            throw createError(
                404,
                'Story không tồn tại hoặc bạn không có quyền xóa.'
            );

        const story = checkResult.recordset[0];

        // Xóa reaction liên quan đến Story
        await new sql.Request(transaction)
            .input('storyId', sql.Int, storyId)
            .query(`DELETE FROM reactions WHERE story_id = @storyId;`);

        // Xóa Story
        await new sql.Request(transaction)
            .input('storyId', sql.Int, storyId)
            .input('userId', sql.Int, userId)
            .query(`  DELETE FROM stories  WHERE id = @storyId AND user_id = @userId;`);

        await transaction.commit();
        return story;

    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error('Lỗi rollback khi xóa Story:', rollbackError);
        }
        throw error;
    }
}

async function deleteExpiredStories() {
    const pool = await sql.connect();

    const result = await pool.request().query(` DELETE FROM stories
        OUTPUT DELETED.media_url WHERE expires_at <= SYSDATETIME();`);

    return result.recordset.map(item => item.media_url);
}

module.exports = {
    createStory,
    getStories,
    getStoryMedia,
    deleteStory,
    deleteExpiredStories
};
