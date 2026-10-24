const { sql } = require('../config/database');
const { HttpError } = require('../utils/postValidation');

const visible = "(p.privacy = 'PUBLIC' OR p.user_id = @viewer)";
const columns = `p.id, p.user_id, p.content, p.privacy, p.created_at, p.updated_at,
    u.username, u.full_name, u.avatar,
    CAST(CASE WHEN EXISTS (SELECT 1 FROM saved_posts sp WHERE sp.post_id = p.id AND sp.user_id = @viewer) THEN 1 ELSE 0 END AS BIT) AS is_saved`;

function attachMedia(posts, media) {
    const grouped = new Map();
    for (const item of media) {
        const values = grouped.get(item.post_id) || [];
        values.push({ id: item.id, media_type: item.media_type, media_url: `/api/posts/${item.post_id}/media/${item.id}`, display_order: item.display_order });
        grouped.set(item.post_id, values);
    }
    return posts.map((post) => ({ ...post, is_saved: Boolean(post.is_saved), media: grouped.get(post.id) || [] }));
}

async function transaction(work) {
    const unit = new sql.Transaction();
    let rolledBack = false;
    unit.on('rollback', () => { rolledBack = true; });
    await unit.begin();
    try {
        const result = await work(unit);
        await unit.commit();
        return result;
    } catch (error) {
        if (!rolledBack) await unit.rollback().catch(() => {});
        throw error;
    }
}

async function lockPost(unit, postId) {
    const result = await new sql.Request(unit).input('id', sql.Int, postId).query(
        'SELECT id, user_id, content, privacy FROM posts WITH (UPDLOCK, HOLDLOCK) WHERE id = @id'
    );
    if (!result.recordset.length) throw new HttpError(404, 'Khong tim thay bai viet.');
    return result.recordset[0];
}

function requireOwner(post, viewer) {
    if (post.user_id !== viewer) throw new HttpError(403, 'Chi chu bai viet duoc thuc hien thao tac nay.');
}

class PostService {
    async list(viewer, { page, limit, offset }, { userId, saved = false } = {}) {
        const request = new sql.Request().input('viewer', sql.Int, viewer)
            .input('limit', sql.Int, limit).input('offset', sql.Int, offset);
        let filter = visible;
        let joins = 'JOIN users u ON u.id = p.user_id';
        let ordering = 'p.created_at DESC, p.id DESC';
        if (userId !== undefined) {
            request.input('userId', sql.Int, userId);
            filter += ' AND p.user_id = @userId';
        }
        if (saved) {
            joins += ' JOIN saved_posts saved ON saved.post_id = p.id AND saved.user_id = @viewer';
            ordering = 'saved.created_at DESC, p.id DESC';
        }
        const result = await request.query(`
            DECLARE @page TABLE (id INT PRIMARY KEY, position BIGINT);
            INSERT INTO @page SELECT p.id, ROW_NUMBER() OVER (ORDER BY ${ordering})
            FROM posts p ${joins} WHERE ${filter}
            ORDER BY ${ordering} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
            SELECT ${columns} FROM @page selected JOIN posts p ON p.id = selected.id
            JOIN users u ON u.id = p.user_id WHERE ${visible} ORDER BY selected.position;
            SELECT pm.id, pm.post_id, pm.media_type, pm.display_order
            FROM post_media pm JOIN @page selected ON selected.id = pm.post_id
            JOIN posts p ON p.id = pm.post_id WHERE ${visible} ORDER BY pm.display_order, pm.id;
            SELECT COUNT(*) AS total FROM posts p ${joins} WHERE ${filter};
        `);
        const total = result.recordsets[2][0].total;
        return { data: attachMedia(result.recordsets[0], result.recordsets[1]), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    async getPost(postId, viewer, unit) {
        const request = unit ? new sql.Request(unit) : new sql.Request();
        const result = await request.input('id', sql.Int, postId).input('viewer', sql.Int, viewer).query(`
            SELECT ${columns} FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = @id AND ${visible};
            SELECT pm.id, pm.post_id, pm.media_type, pm.display_order FROM post_media pm
            JOIN posts p ON p.id = pm.post_id WHERE p.id = @id AND ${visible} ORDER BY pm.display_order, pm.id;
        `);
        if (!result.recordsets[0].length) throw new HttpError(404, 'Khong tim thay bai viet.');
        return attachMedia(result.recordsets[0], result.recordsets[1])[0];
    }

    async createPost(viewer, input, media) {
        return transaction(async (unit) => {
            const result = await new sql.Request(unit)
                .input('user', sql.Int, viewer).input('content', sql.NVarChar(sql.MAX), input.content)
                .input('privacy', sql.NVarChar(20), input.privacy).query(`
                    INSERT INTO posts (user_id, content, privacy) OUTPUT INSERTED.id VALUES (@user, @content, @privacy);
                `);
            const postId = result.recordset[0].id;
            for (const item of media) {
                await new sql.Request(unit).input('post', sql.Int, postId)
                    .input('url', sql.NVarChar(sql.MAX), item.media_url).input('type', sql.NVarChar(20), item.media_type)
                    .input('position', sql.Int, item.display_order).query(`
                        INSERT INTO post_media (post_id, media_url, media_type, display_order) VALUES (@post, @url, @type, @position);
                    `);
            }
            return this.getPost(postId, viewer, unit);
        });
    }

    async updatePost(postId, viewer, input) {
        return transaction(async (unit) => {
            const post = await lockPost(unit, postId);
            requireOwner(post, viewer);
            const content = input.content ?? post.content ?? '';
            if (!content.trim()) {
                const media = await new sql.Request(unit).input('id', sql.Int, postId).query('SELECT COUNT(*) AS total FROM post_media WHERE post_id = @id');
                if (!media.recordset[0].total) throw new HttpError(400, 'Bai viet khong duoc de trong.');
            }
            await new sql.Request(unit).input('id', sql.Int, postId)
                .input('content', sql.NVarChar(sql.MAX), content).input('privacy', sql.NVarChar(20), input.privacy ?? post.privacy)
                .query('UPDATE posts SET content = @content, privacy = @privacy, updated_at = GETDATE() WHERE id = @id');
            return this.getPost(postId, viewer, unit);
        });
    }

    async deletePost(postId, viewer) {
        return transaction(async (unit) => {
            requireOwner(await lockPost(unit, postId), viewer);
            const result = await new sql.Request(unit).input('id', sql.Int, postId).query(`
                SELECT media_url FROM post_media WHERE post_id = @id
                UNION SELECT cm.media_url FROM comment_media cm JOIN comments c ON c.id = cm.comment_id WHERE c.post_id = @id;
                DELETE FROM notifications WHERE post_id = @id OR comment_id IN (SELECT id FROM comments WHERE post_id = @id);
                DELETE FROM saved_posts WHERE post_id = @id;
                DELETE FROM reactions WHERE post_id = @id;
                DELETE FROM posts WHERE id = @id;
            `);
            return result.recordset.map((item) => item.media_url);
        });
    }

    async savePost(postId, viewer) {
        await transaction(async (unit) => {
            const post = await lockPost(unit, postId);
            if (post.user_id !== viewer && post.privacy !== 'PUBLIC') throw new HttpError(404, 'Khong tim thay bai viet.');
            await new sql.Request(unit).input('post', sql.Int, postId).input('viewer', sql.Int, viewer).query(`
                IF NOT EXISTS (SELECT 1 FROM saved_posts WHERE post_id = @post AND user_id = @viewer)
                    INSERT INTO saved_posts (user_id, post_id) VALUES (@viewer, @post);
            `);
        });
    }

    async unsavePost(postId, viewer) {
        await new sql.Request().input('post', sql.Int, postId).input('viewer', sql.Int, viewer)
            .query('DELETE FROM saved_posts WHERE post_id = @post AND user_id = @viewer');
    }

    async getMedia(postId, mediaId, viewer) {
        const result = await new sql.Request().input('post', sql.Int, postId).input('media', sql.Int, mediaId)
            .input('viewer', sql.Int, viewer).query(`
                SELECT pm.media_url, pm.media_type FROM post_media pm JOIN posts p ON p.id = pm.post_id
                WHERE p.id = @post AND pm.id = @media AND ${visible};
            `);
        if (!result.recordset.length) throw new HttpError(404, 'Khong tim thay tep.');
        return result.recordset[0];
    }

    async unreferencedFiles(keys) {
        const removable = [];
        for (const key of new Set(keys)) {
            const result = await new sql.Request().input('key', sql.NVarChar(sql.MAX), key).query(`
                SELECT TOP (1) media_url FROM (
                    SELECT media_url FROM post_media UNION ALL SELECT media_url FROM comment_media
                    UNION ALL SELECT media_url FROM message_media UNION ALL SELECT media_url FROM stories
                    UNION ALL SELECT avatar AS media_url FROM users
                ) refs WHERE media_url = @key;
            `);
            if (!result.recordset.length) removable.push(key);
        }
        return removable;
    }
}

module.exports = new PostService();
