const { sql } = require('../config/database');
const { HttpError } = require('../utils/postValidation');
const notificationService = require('./notificationService');

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

function requestFor(unit) {
    return unit ? Promise.resolve(new sql.Request(unit)) : sql.connect().then((pool) => pool.request());
}

function escapeLike(value) {
    return value.replace(/[\\%_[]/g, (char) => `\\${char}`);
}

async function isMember(conversationId, viewerId, unit = null) {
    const request = await requestFor(unit);
    const result = await request
        .input('conversation', sql.Int, conversationId)
        .input('viewer', sql.Int, viewerId)
        .query(`
            SELECT 1
            FROM conversation_members
            WHERE conversation_id = @conversation AND user_id = @viewer;
        `);
    return result.recordset.length > 0;
}

async function requireMember(conversationId, viewerId, unit = null) {
    if (!(await isMember(conversationId, viewerId, unit))) {
        throw fail(403, 'Ban khong phai thanh vien cua cuoc tro chuyen nay.');
    }
}

function mapUser(row, prefix = '') {
    return {
        id: row[`${prefix}id`],
        username: row[`${prefix}username`],
        full_name: row[`${prefix}full_name`],
        avatar: row[`${prefix}avatar`],
    };
}

async function loadRelated(conversationIds) {
    const members = new Map();
    const lastMessages = new Map();

    if (!conversationIds.length) return { members, lastMessages };

    const ids = conversationIds.join(',');
    const pool = await sql.connect();

    const memberResult = await pool.request().query(`
        SELECT cm.conversation_id, cm.user_id, cm.joined_at,
               u.username, u.full_name, u.avatar
        FROM conversation_members cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.conversation_id IN (${ids})
        ORDER BY cm.joined_at ASC, cm.user_id ASC;
    `);

    for (const row of memberResult.recordset) {
        const list = members.get(row.conversation_id) || [];
        list.push({
            conversation_id: row.conversation_id,
            user_id: row.user_id,
            joined_at: row.joined_at,
            user: mapUser(row),
        });
        members.set(row.conversation_id, list);
    }

    const messageResult = await pool.request().query(`
        SELECT id, sender_id, conversation_id, parent_message_id, content, sent_at
        FROM (
            SELECT m.*, ROW_NUMBER() OVER (
                PARTITION BY m.conversation_id
                ORDER BY m.sent_at DESC, m.id DESC
            ) AS rn
            FROM messages m
            WHERE m.conversation_id IN (${ids})
        ) ranked
        WHERE rn = 1;
    `);

    for (const row of messageResult.recordset) {
        lastMessages.set(row.conversation_id, row);
    }

    return { members, lastMessages };
}

async function listConversations(viewerId) {
    const viewer = positiveId(viewerId, 'User ID');
    const pool = await sql.connect();

    const result = await pool.request()
        .input('viewer', sql.Int, viewer)
        .query(`
            SELECT
                c.id, c.type, c.name, c.created_at,
                ISNULL(MAX(m.sent_at), c.created_at) AS updated_at,
                (
                    SELECT COUNT(*)
                    FROM messages unread
                    LEFT JOIN message_reads mr
                        ON mr.message_id = unread.id AND mr.user_id = @viewer
                    WHERE unread.conversation_id = c.id
                        AND unread.sender_id <> @viewer
                        AND mr.user_id IS NULL
                ) AS unread_count
            FROM conversations c
            JOIN conversation_members mine
                ON mine.conversation_id = c.id AND mine.user_id = @viewer
            LEFT JOIN messages m ON m.conversation_id = c.id
            GROUP BY c.id, c.type, c.name, c.created_at
            ORDER BY updated_at DESC, c.id DESC;
        `);

    const { members, lastMessages } = await loadRelated(result.recordset.map((row) => row.id));

    return result.recordset.map((row) => ({
        id: row.id,
        type: row.type,
        name: row.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
        members: members.get(row.id) || [],
        last_message: lastMessages.get(row.id) || null,
        unread_count: Number(row.unread_count) || 0,
    }));
}

async function getConversation(conversationId, viewerId) {
    const conversation = positiveId(conversationId, 'Conversation ID');
    const viewer = positiveId(viewerId, 'User ID');
    await requireMember(conversation, viewer);

    const pool = await sql.connect();
    const result = await pool.request()
        .input('conversation', sql.Int, conversation)
        .input('viewer', sql.Int, viewer)
        .query(`
            SELECT c.id, c.type, c.name, c.created_at,
                   ISNULL(MAX(m.sent_at), c.created_at) AS updated_at
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE c.id = @conversation
            GROUP BY c.id, c.type, c.name, c.created_at;
        `);

    if (!result.recordset.length) throw fail(404, 'Khong tim thay cuoc tro chuyen.');

    const { members, lastMessages } = await loadRelated([conversation]);
    const row = result.recordset[0];

    return {
        id: row.id,
        type: row.type,
        name: row.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
        members: members.get(conversation) || [],
        last_message: lastMessages.get(conversation) || null,
        unread_count: 0,
    };
}

async function searchUsers(viewerId, query) {
    const viewer = positiveId(viewerId, 'User ID');
    const term = typeof query === 'string' ? query.trim().slice(0, 100) : '';
    const pattern = `%${escapeLike(term)}%`;
    const pool = await sql.connect();

    const result = await pool.request()
        .input('viewer', sql.Int, viewer)
        .input('pattern', sql.NVarChar(302), pattern)
        .query(`
            SELECT TOP 20 id, username, full_name, avatar
            FROM users
            WHERE id <> @viewer
                AND (@pattern = '%' OR username LIKE @pattern ESCAPE '\\'
                    OR full_name LIKE @pattern ESCAPE '\\'
                    OR email LIKE @pattern ESCAPE '\\')
            ORDER BY id ASC;
        `);

    return result.recordset.map((row) => mapUser(row));
}

async function createConversation(viewerId, input) {
    const viewer = positiveId(viewerId, 'User ID');
    if (!input || typeof input !== 'object') throw fail(400, 'Du lieu khong hop le.');

    const participantId = input.participant_id == null ? null : positiveId(input.participant_id, 'Participant ID');
    const memberIds = Array.isArray(input.member_ids) ? input.member_ids : [];
    const name = typeof input.name === 'string' ? input.name.trim() : '';

    if (participantId !== null) {
        if (participantId === viewer) throw fail(400, 'Khong the tao cuoc tro chuyen voi chinh minh.');

        const pool = await sql.connect();
        const existing = await pool.request()
            .input('viewer', sql.Int, viewer)
            .input('participant', sql.Int, participantId)
            .query(`
                SELECT c.id
                FROM conversations c
                JOIN conversation_members mine
                    ON mine.conversation_id = c.id AND mine.user_id = @viewer
                JOIN conversation_members other
                    ON other.conversation_id = c.id AND other.user_id = @participant
                WHERE c.type = 'DIRECT';
            `);

        if (existing.recordset.length) return getConversation(existing.recordset[0].id, viewer);

        const userResult = await pool.request()
            .input('participant', sql.Int, participantId)
            .query(`SELECT id FROM users WHERE id = @participant;`);

        if (!userResult.recordset.length) throw fail(404, 'Khong tim thay nguoi dung.');

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const insert = await new sql.Request(transaction).query(`
                INSERT INTO conversations (type, name)
                OUTPUT INSERTED.id
                VALUES ('DIRECT', NULL);
            `);
            const conversationId = insert.recordset[0].id;

            for (const userId of [viewer, participantId]) {
                await new sql.Request(transaction)
                    .input('conversation', sql.Int, conversationId)
                    .input('user', sql.Int, userId)
                    .query(`
                        INSERT INTO conversation_members (conversation_id, user_id)
                        VALUES (@conversation, @user);
                    `);
            }

            await transaction.commit();
            return getConversation(conversationId, viewer);
        } catch (error) {
            await transaction.rollback().catch(() => {});
            throw error;
        }
    }

    if (!name || name.length > 255) throw fail(400, 'Ten nhom phai tu 1 den 255 ky tu.');

    const uniqueMembers = [...new Set(memberIds.map((id) => positiveId(id, 'Member ID')))];
    if (uniqueMembers.includes(viewer)) throw fail(400, 'Danh sach thanh vien khong hop le.');
    if (uniqueMembers.length < 2 || uniqueMembers.length > 50) {
        throw fail(400, 'Nhom can it nhat 2 thanh vien khac ban va toi da 50 thanh vien.');
    }

    const pool = await sql.connect();
    const usersResult = await pool.request().query(`
        SELECT id FROM users WHERE id IN (${[...uniqueMembers, viewer].join(',')});
    `);

    if (usersResult.recordset.length !== uniqueMembers.length + 1) {
        throw fail(404, 'Khong tim thay mot hoac nhieu thanh vien.');
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const insert = await new sql.Request(transaction)
            .input('name', sql.NVarChar(255), name)
            .query(`
                INSERT INTO conversations (type, name)
                OUTPUT INSERTED.id
                VALUES ('GROUP', @name);
            `);
        const conversationId = insert.recordset[0].id;

        for (const userId of [viewer, ...uniqueMembers]) {
            await new sql.Request(transaction)
                .input('conversation', sql.Int, conversationId)
                .input('user', sql.Int, userId)
                .query(`
                    INSERT INTO conversation_members (conversation_id, user_id)
                    VALUES (@conversation, @user);
                `);
        }

        await transaction.commit();
        return getConversation(conversationId, viewer);
    } catch (error) {
        await transaction.rollback().catch(() => {});
        throw error;
    }
}

async function getMessages(conversationId, viewerId) {
    const conversation = positiveId(conversationId, 'Conversation ID');
    const viewer = positiveId(viewerId, 'User ID');
    await requireMember(conversation, viewer);

    const pool = await sql.connect();
    const result = await pool.request()
        .input('conversation', sql.Int, conversation)
        .input('viewer', sql.Int, viewer)
        .query(`
            WITH recent AS (
                SELECT TOP 100 *
                FROM messages
                WHERE conversation_id = @conversation
                ORDER BY sent_at DESC, id DESC
            )
            SELECT m.id, m.sender_id, m.conversation_id, m.parent_message_id,
                   m.content, m.sent_at,
                   u.username, u.full_name, u.avatar,
                   CASE WHEN mr.user_id IS NULL THEN 0 ELSE 1 END AS is_read
            FROM recent m
            JOIN users u ON u.id = m.sender_id
            LEFT JOIN message_reads mr
                ON mr.message_id = m.id AND mr.user_id = @viewer
            ORDER BY m.sent_at ASC, m.id ASC;
        `);

    return result.recordset.map((row) => ({
        id: row.id,
        sender_id: row.sender_id,
        conversation_id: row.conversation_id,
        parent_message_id: row.parent_message_id,
        content: row.content,
        sent_at: row.sent_at,
        is_read: Number(row.is_read) === 1 ? 1 : 0,
        sender: mapUser(row),
        media: [],
    }));
}

async function getMessageById(messageId, viewerId) {
    const id = positiveId(messageId, 'Message ID');
    const viewer = positiveId(viewerId, 'User ID');
    const pool = await sql.connect();

    const result = await pool.request()
        .input('id', sql.Int, id)
        .input('viewer', sql.Int, viewer)
        .query(`
            SELECT m.id, m.sender_id, m.conversation_id, m.parent_message_id,
                   m.content, m.sent_at,
                   u.username, u.full_name, u.avatar,
                   CASE WHEN mr.user_id IS NULL THEN 0 ELSE 1 END AS is_read
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            LEFT JOIN message_reads mr
                ON mr.message_id = m.id AND mr.user_id = @viewer
            WHERE m.id = @id;
        `);

    const row = result.recordset[0];
    if (!row) throw fail(404, 'Khong tim thay tin nhan.');

    return {
        id: row.id,
        sender_id: row.sender_id,
        conversation_id: row.conversation_id,
        parent_message_id: row.parent_message_id,
        content: row.content,
        sent_at: row.sent_at,
        is_read: Number(row.is_read) === 1 ? 1 : 0,
        sender: mapUser(row),
        media: [],
    };
}

async function createMessage(conversationId, viewerId, input) {
    const conversation = positiveId(conversationId, 'Conversation ID');
    const sender = positiveId(viewerId, 'User ID');

    if (!input || typeof input.content !== 'string') throw fail(400, 'Noi dung tin nhan khong hop le.');

    const content = input.content.trim();
    if (!content || content.length > 5000) throw fail(400, 'Tin nhan phai tu 1 den 5000 ky tu.');

    const parentMessageId = input.parent_message_id == null || input.parent_message_id === ''
        ? null
        : positiveId(input.parent_message_id, 'Parent Message ID');

    const pool = await sql.connect();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        await requireMember(conversation, sender, transaction);

        if (parentMessageId !== null) {
            const parentResult = await new sql.Request(transaction)
                .input('id', sql.Int, parentMessageId)
                .input('conversation', sql.Int, conversation)
                .query(`
                    SELECT id FROM messages WHERE id = @id AND conversation_id = @conversation;
                `);

            if (!parentResult.recordset.length) throw fail(404, 'Khong tim thay tin nhan can tra loi.');
        }

        const insert = await new sql.Request(transaction)
            .input('sender', sql.Int, sender)
            .input('conversation', sql.Int, conversation)
            .input('parent', sql.Int, parentMessageId)
            .input('content', sql.NVarChar(sql.MAX), content)
            .query(`
                INSERT INTO messages (sender_id, conversation_id, parent_message_id, content)
                OUTPUT INSERTED.id
                VALUES (@sender, @conversation, @parent, @content);
            `);

        const messageId = insert.recordset[0].id;

        const recipients = await new sql.Request(transaction)
            .input('conversation', sql.Int, conversation)
            .input('sender', sql.Int, sender)
            .query(`
                SELECT user_id
                FROM conversation_members
                WHERE conversation_id = @conversation AND user_id <> @sender;
            `);

        for (const recipient of recipients.recordset) {
            await notificationService.addNotification({
                type: 'MESSAGED',
                senderId: sender,
                receiverId: recipient.user_id,
                messageId,
                unit: transaction,
            });
        }

        await transaction.commit();
        return await getMessageById(messageId, sender);
    } catch (error) {
        await transaction.rollback().catch(() => {});
        throw error;
    }
}

async function markConversationRead(conversationId, viewerId) {
    const conversation = positiveId(conversationId, 'Conversation ID');
    const viewer = positiveId(viewerId, 'User ID');
    const pool = await sql.connect();

    await requireMember(conversation, viewer);

    await pool.request()
        .input('conversation', sql.Int, conversation)
        .input('viewer', sql.Int, viewer)
        .query(`
            INSERT INTO message_reads (user_id, message_id, read_at)
            SELECT @viewer, m.id, SYSDATETIME()
            FROM messages m
            WHERE m.conversation_id = @conversation
                AND m.sender_id <> @viewer
                AND NOT EXISTS (
                    SELECT 1 FROM message_reads mr
                    WHERE mr.message_id = m.id AND mr.user_id = @viewer
                );
        `);

    await notificationService.markConversationNotificationsRead(conversation, viewer);

    return { conversation_id: conversation, ok: true };
}

module.exports = {
    listConversations,
    getConversation,
    searchUsers,
    createConversation,
    getMessages,
    createMessage,
    markConversationRead,
};
