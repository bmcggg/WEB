const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { getJwtSecret } = require('./config/jwt');
const { sql } = require('./config/database');

const MAX_PARTICIPANTS = 6;
const RING_DURATION = 30000;
const userRoom = (id) => 'user:' + id;

async function getMembers(conversationId, userId) {
    const result = await new sql.Request().input('id', sql.Int, conversationId)
        .input('user', sql.Int, userId).query(`
            SELECT user_id FROM conversation_members WHERE conversation_id = @id
            AND EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = @id AND user_id = @user)
        `);
    return result.recordset.map((row) => row.user_id);
}

function attachVideoCalls(server, { membersOf = getMembers } = {}) {
    const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const io = new Server(server, { cors: { origin }, maxHttpBufferSize: 100000 });
    const calls = new Map();
    const conversations = new Map();
    const activeUsers = new Map();

    io.use((socket, next) => {
        try {
            const user = jwt.verify(socket.handshake.auth.token, getJwtSecret(), { algorithms: ['HS256'] });
            if (!Number.isInteger(user.id) || user.id < 1 || user.id > 2147483647) throw new Error();
            socket.data.user = user;
            next();
        } catch {
            next(new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'));
        }
    });

    function end(call, reason) {
        clearTimeout(call.timer);
        calls.delete(call.id);
        conversations.delete(call.conversationId);
        for (const userId of call.participants.keys()) activeUsers.delete(userId);
        for (const userId of [...call.participants.keys(), ...call.pending]) {
            io.to(userRoom(userId)).emit('call:ended', { id: call.id, reason });
        }
    }

    function leave(socket) {
        const userId = socket.data.user.id;
        const call = calls.get(activeUsers.get(userId));
        if (call?.participants.get(userId) !== socket.id) return;
        call.participants.delete(userId);
        activeUsers.delete(userId);
        if (!call.participants.size || (call.participants.size === 1 && !call.pending.size)) {
            end(call, 'Cuộc gọi đã kết thúc.');
        } else {
            for (const peer of call.participants.values()) io.to(peer).emit('call:peer-left', { id: call.id, userId });
        }
    }

    io.on('connection', (socket) => {
        const { id: userId, exp } = socket.data.user;
        socket.join(userRoom(userId));
        const expiry = exp && setTimeout(() => socket.disconnect(true), Math.min(
            Math.max(1, exp * 1000 - Date.now()), 2147483647,
        ));

        function handle(event, action) {
            socket.on(event, async (payload, ack) => {
                if (typeof ack !== 'function') return;
                if (!payload || typeof payload !== 'object') return ack({ error: 'Dữ liệu cuộc gọi không hợp lệ.' });
                if (exp && exp * 1000 <= Date.now()) return ack({ error: 'Phiên đăng nhập đã hết hạn.' });
                try {
                    ack(await action(payload));
                } catch (error) {
                    console.error('Call request failed:', error.code || error.name);
                    ack({ error: 'Không xử lý được cuộc gọi.' });
                }
            });
        }

        handle('call:start', async ({ conversationId }) => {
            if (!Number.isInteger(conversationId) || conversationId < 1 || conversationId > 2147483647) {
                return { error: 'Cuộc trò chuyện không hợp lệ.' };
            }
            const members = await membersOf(conversationId, userId);
            if (!socket.connected || !members.includes(userId)) return { error: 'Bạn không có quyền gọi trong cuộc trò chuyện này.' };
            if (activeUsers.has(userId) || conversations.has(conversationId)) return { error: 'Đã có cuộc gọi đang diễn ra.' };
            const pending = new Set(members.filter((id) => id !== userId && !activeUsers.has(id)
                && io.sockets.adapter.rooms.has(userRoom(id))));
            if (!pending.size) return { error: 'Chưa có thành viên nào rảnh và đang mở trang trò chuyện.' };
            const call = { id: randomUUID(), conversationId, pending, participants: new Map([[userId, socket.id]]) };
            calls.set(call.id, call);
            conversations.set(conversationId, call.id);
            activeUsers.set(userId, call.id);
            call.timer = setTimeout(() => {
                if (call.participants.size < 2) {
                    end(call, 'Không có ai nhận cuộc gọi.');
                    return;
                }
                for (const id of call.pending) {
                    io.to(userRoom(id)).emit('call:ended', { id: call.id, reason: 'Lời mời đã hết hạn.' });
                }
                call.pending.clear();
            }, RING_DURATION);
            for (const id of pending) {
                io.to(userRoom(id)).emit('call:invite', { id: call.id, conversationId, callerId: userId });
            }
            return { id: call.id };
        });

        handle('call:join', async ({ id }) => {
            const call = calls.get(id);
            if (!call?.pending.has(userId)) return { error: 'Lời mời đã hết hạn.' };
            const members = await membersOf(call.conversationId, userId);
            if (!socket.connected || calls.get(id) !== call || !call.pending.has(userId) || !members.includes(userId)) {
                return { error: 'Lời mời không còn khả dụng.' };
            }
            if (activeUsers.has(userId) || call.participants.size >= MAX_PARTICIPANTS) {
                return { error: 'Bạn đang bận hoặc cuộc gọi đã đủ người.' };
            }
            call.pending.delete(userId);
            socket.to(userRoom(userId)).emit('call:ended', { id, reason: 'Cuộc gọi đã được nhận từ cửa sổ khác.' });
            const peers = [...call.participants.keys()];
            call.participants.set(userId, socket.id);
            activeUsers.set(userId, id);
            return { id, peers };
        });

        handle('call:decline', ({ id }) => {
            const call = calls.get(id);
            if (call?.pending.delete(userId)) {
                io.to(userRoom(userId)).emit('call:ended', { id, reason: 'Đã từ chối cuộc gọi.' });
                if (call.participants.size === 1 && !call.pending.size) end(call, 'Không có ai nhận cuộc gọi.');
            }
            return {};
        });

        handle('call:leave', ({ id }) => {
            if (activeUsers.get(userId) === id) leave(socket);
            return {};
        });

        handle('call:signal', ({ id, to, description, candidate }) => {
            const call = calls.get(id);
            const peer = call?.participants.get(to);
            if (!peer || to === userId || call.participants.get(userId) !== socket.id) {
                return { error: 'Người nhận tín hiệu không có trong cuộc gọi.' };
            }
            const validDescription = ['offer', 'answer'].includes(description?.type) && typeof description.sdp === 'string';
            const validCandidate = typeof candidate?.candidate === 'string';
            if (validDescription === validCandidate) return { error: 'Tín hiệu không hợp lệ.' };
            io.to(peer).emit('call:signal', { id, from: userId, description, candidate });
            return {};
        });

        socket.on('disconnect', () => {
            clearTimeout(expiry);
            leave(socket);
        });
    });

    return io;
}

module.exports = attachVideoCalls;
