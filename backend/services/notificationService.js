const { sql } = require('../config/database');
const { HttpError } = require('../utils/postValidation');

const TYPES = ['REACTED', 'COMMENTED', 'FOLLOWED', 'MESSAGED'];

function fail(status, message) {
    const error = new HttpError(status, message);
    error.statusCode = status;
    return error;
}

function positiveId(value, label) {
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) {
        throw fail(400, `${label} khong hop le.`);
    }
    return Number(value);
}

function optionalId(value, label) {
    if (value === null || value === undefined || value === '') return null;
    return positiveId(value, label);
}

function makeRequest(unit) {
    return unit ? Promise.resolve(new sql.Request(unit)) : sql.connect().then((pool) => pool.request());
}

const MATCH_COLUMNS = `
    sender_id = @sender
    AND receiver_id = @receiver
    AND type = @type
    AND (post_id = @postId OR (post_id IS NULL AND @postId IS NULL))
    AND (comment_id = @commentId OR (comment_id IS NULL AND @commentId IS NULL))
    AND (message_id = @messageId OR (message_id IS NULL AND @messageId IS NULL))`;

async function addNotification({ type, senderId, receiverId, postId = null, commentId = null, messageId = null, unit = null }) {
    if (!TYPES.includes(type)) throw fail(400, 'Loai thong bao khong hop le.');
    if (senderId == null || receiverId == null) return null;

    const sender = positiveId(senderId, 'Sender ID');
    const receiver = positiveId(receiverId, 'Receiver ID');

    if (sender === receiver) return null;

    const post = optionalId(postId, 'Post ID');
    const comment = optionalId(commentId, 'Comment ID');
    const message = optionalId(messageId, 'Message ID');

    const find = await makeRequest(unit);
    const existing = await find
        .input('sender', sql.Int, sender)
        .input('receiver', sql.Int, receiver)
        .input('type', sql.NVarChar(20), type)
        .input('postId', sql.Int, post)
        .input('commentId', sql.Int, comment)
        .input('messageId', sql.Int, message)
        .query(`SELECT id FROM notifications WHERE ${MATCH_COLUMNS};`);

    if (existing.recordset.length) {
        const id = existing.recordset[0].id;
        const update = await makeRequest(unit);
        await update
            .input('id', sql.Int, id)
            .query(`UPDATE notifications SET is_read = 0, created_at = SYSDATETIME() WHERE id = @id;`);
        return { id, updated: true };
    }

    const insert = await makeRequest(unit);
    const result = await insert
        .input('sender', sql.Int, sender)
        .input('receiver', sql.Int, receiver)
        .input('type', sql.NVarChar(20), type)
        .input('postId', sql.Int, post)
        .input('commentId', sql.Int, comment)
        .input('messageId', sql.Int, message)
        .query(`
            INSERT INTO notifications (type, sender_id, receiver_id, post_id, comment_id, message_id)
            OUTPUT INSERTED.id
            VALUES (@type, @sender, @receiver, @postId, @commentId, @messageId);`);

    return { id: result.recordset[0].id, updated: false };
}

async function removeNotification({ type, senderId, receiverId, postId = null, commentId = null, messageId = null, unit = null }) {
    if (senderId == null || receiverId == null) return { deleted: 0 };

    const sender = positiveId(senderId, 'Sender ID');
    const receiver = positiveId(receiverId, 'Receiver ID');
    const post = optionalId(postId, 'Post ID');
    const comment = optionalId(commentId, 'Comment ID');
    const message = optionalId(messageId, 'Message ID');

    const request = await makeRequest(unit);
    const result = await request
        .input('sender', sql.Int, sender)
        .input('receiver', sql.Int, receiver)
        .input('type', sql.NVarChar(20), type)
        .input('postId', sql.Int, post)
        .input('commentId', sql.Int, comment)
        .input('messageId', sql.Int, message)
        .query(`DELETE FROM notifications WHERE ${MATCH_COLUMNS};`);

    return { deleted: result.rowsAffected[0] || 0 };
}

async function listNotifications(viewerId, limit = 100) {
    const viewer = positiveId(viewerId, 'User ID');
    const pool = await sql.connect();

    const result = await pool.request()
        .input('viewer', sql.Int, viewer)
        .input('limit', sql.Int, limit)
        .query(`
            SELECT TOP (@limit)
                n.id, n.type, n.sender_id, n.receiver_id, n.post_id, n.comment_id,
                n.message_id, n.is_read, n.created_at,
                u.username, u.full_name, u.avatar
            FROM notifications n
            JOIN users u ON u.id = n.sender_id
            WHERE n.receiver_id = @viewer
            ORDER BY n.created_at DESC, n.id DESC;

            SELECT COUNT(*) AS unread_count
            FROM notifications
            WHERE receiver_id = @viewer AND is_read = 0;
        `);

    const items = result.recordsets[0].map((row) => ({
        id: row.id,
        type: row.type,
        sender_id: row.sender_id,
        receiver_id: row.receiver_id,
        post_id: row.post_id,
        comment_id: row.comment_id,
        message_id: row.message_id,
        is_read: Number(row.is_read) === 1 ? 1 : 0,
        created_at: row.created_at,
        sender: {
            id: row.sender_id,
            username: row.username,
            full_name: row.full_name,
            avatar: row.avatar,
        },
    }));

    return {
        items,
        unread_count: Number(result.recordsets[1][0]?.unread_count) || 0,
    };
}

async function markNotificationRead(notificationId, viewerId) {
    const id = positiveId(notificationId, 'Notification ID');
    const viewer = positiveId(viewerId, 'User ID');
    const pool = await sql.connect();

    const result = await pool.request()
        .input('id', sql.Int, id)
        .input('viewer', sql.Int, viewer)
        .query(`
            UPDATE notifications
            SET is_read = 1
            WHERE id = @id AND receiver_id = @viewer;

            SELECT id, is_read FROM notifications WHERE id = @id AND receiver_id = @viewer;
        `);

    if (!result.recordsets[1].length) throw fail(404, 'Khong tim thay thong bao.');

    return { id, is_read: 1 };
}

async function markAllNotificationsRead(viewerId) {
    const viewer = positiveId(viewerId, 'User ID');
    const pool = await sql.connect();

    const result = await pool.request()
        .input('viewer', sql.Int, viewer)
        .query(`
            UPDATE notifications
            SET is_read = 1
            WHERE receiver_id = @viewer AND is_read = 0;
        `);

    return { updated: result.rowsAffected[0] || 0 };
}

async function markConversationNotificationsRead(conversationId, viewerId) {
    const conversation = positiveId(conversationId, 'Conversation ID');
    const viewer = positiveId(viewerId, 'User ID');
    const pool = await sql.connect();

    await pool.request()
        .input('conversation', sql.Int, conversation)
        .input('viewer', sql.Int, viewer)
        .query(`
            UPDATE n
            SET is_read = 1
            FROM notifications n
            JOIN messages m ON m.id = n.message_id
            WHERE n.receiver_id = @viewer
                AND n.type = 'MESSAGED'
                AND m.conversation_id = @conversation;
        `);
}

module.exports = {
    TYPES,
    addNotification,
    removeNotification,
    listNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    markConversationNotificationsRead,
};
