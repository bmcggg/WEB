const { sql } = require('../config/database');

class SocialService {
    // 1. THEO DÕI NGƯỜI DÙNG (CẠNH ĐỒ THỊ FOLLOWS)
    async followUser(followerId, followingId) {
        if (followerId === followingId) {
            const err = new Error('Bạn không thể tự theo dõi chính mình!');
            err.status = 400;
            throw err;
        }

        // Kiểm tra target user có tồn tại và chưa bị xóa mềm
        const reqTarget = new sql.Request();
        reqTarget.input('followingId', sql.Int, followingId);
        const targetRes = await reqTarget.query(`
            SELECT id FROM users WHERE id = @followingId AND deleted_at IS NULL
        `);
        if (targetRes.recordset.length === 0) {
            const err = new Error('Người dùng không tồn tại hoặc tài khoản đã bị vô hiệu hóa!');
            err.status = 404;
            throw err;
        }

        // Kiểm tra đã follow chưa bằng cú pháp MATCH
        const reqCheck = new sql.Request();
        reqCheck.input('followerId', sql.Int, followerId);
        reqCheck.input('followingId', sql.Int, followingId);
        const checkRes = await reqCheck.query(`
            SELECT 1 
            FROM users u1, follows f, users u2
            WHERE MATCH(u1-(f)->u2)
              AND u1.id = @followerId AND u2.id = @followingId
        `);

        if (checkRes.recordset.length > 0) {
            return { message: 'Bạn đã theo dõi người dùng này rồi.' };
        }

        // Chèn Cạnh đồ thị vào follows AS EDGE
        const reqInsert = new sql.Request();
        reqInsert.input('followerId', sql.Int, followerId);
        reqInsert.input('followingId', sql.Int, followingId);
        await reqInsert.query(`
            INSERT INTO follows ($from_id, $to_id, created_at)
            VALUES (
                (SELECT $node_id FROM users WHERE id = @followerId),
                (SELECT $node_id FROM users WHERE id = @followingId),
                GETDATE()
            )
        `);

        return { message: 'Đã theo dõi người dùng thành công!' };
    }

    // 2. HỦY THEO DÕI
    async unfollowUser(followerId, followingId) {
        const reqDelete = new sql.Request();
        reqDelete.input('followerId', sql.Int, followerId);
        reqDelete.input('followingId', sql.Int, followingId);
        await reqDelete.query(`
            DELETE f
            FROM users u1, follows f, users u2
            WHERE MATCH(u1-(f)->u2)
              AND u1.id = @followerId AND u2.id = @followingId
        `);

        return { message: 'Đã hủy theo dõi thành công!' };
    }

    // 3. LẤY DANH SÁCH NGƯỜI THEO DÕI (FOLLOWERS)
    async getFollowers(userId) {
        const req = new sql.Request();
        req.input('userId', sql.Int, userId);
        const res = await req.query(`
            SELECT u1.id, u1.username, u1.full_name, u1.avatar, u1.bio
            FROM users u1, follows f, users u2
            WHERE MATCH(u1-(f)->u2)
              AND u2.id = @userId
              AND u1.deleted_at IS NULL
            ORDER BY f.created_at DESC
        `);
        return res.recordset;
    }

    // 4. LẤY DANH SÁCH ĐANG THEO DÕI (FOLLOWING)
    async getFollowing(userId) {
        const req = new sql.Request();
        req.input('userId', sql.Int, userId);
        const res = await req.query(`
            SELECT u2.id, u2.username, u2.full_name, u2.avatar, u2.bio
            FROM users u1, follows f, users u2
            WHERE MATCH(u1-(f)->u2)
              AND u1.id = @userId
              AND u2.deleted_at IS NULL
            ORDER BY f.created_at DESC
        `);
        return res.recordset;
    }

    // 5. GỬI LỜI MỜI KẾT BẠN
    async sendFriendRequest(requesterId, receiverId) {
        if (requesterId === receiverId) {
            const err = new Error('Bạn không thể gửi lời mời kết bạn cho chính mình!');
            err.status = 400;
            throw err;
        }

        // Kiểm tra đối phương tồn tại
        const reqCheckUser = new sql.Request();
        reqCheckUser.input('receiverId', sql.Int, receiverId);
        const userRes = await reqCheckUser.query(`
            SELECT id FROM users WHERE id = @receiverId AND deleted_at IS NULL
        `);
        if (userRes.recordset.length === 0) {
            const err = new Error('Người dùng không tồn tại hoặc đã bị vô hiệu hóa!');
            err.status = 404;
            throw err;
        }

        // Kiểm tra đã là bạn bè chưa
        const reqCheckFriend = new sql.Request();
        reqCheckFriend.input('u1', sql.Int, requesterId);
        reqCheckFriend.input('u2', sql.Int, receiverId);
        const friendRes = await reqCheckFriend.query(`
            SELECT 1 
            FROM users u1, friends_with f, users u2
            WHERE MATCH(u1-(f)->u2)
              AND u1.id = @u1 AND u2.id = @u2
        `);
        if (friendRes.recordset.length > 0) {
            return { message: 'Hai bạn đã là bạn bè của nhau rồi.' };
        }

        // Kiểm tra lời mời hiện có
        const reqReq = new sql.Request();
        reqReq.input('u1', sql.Int, requesterId);
        reqReq.input('u2', sql.Int, receiverId);
        const existingReq = await reqReq.query(`
            SELECT id, requester_id, receiver_id, status 
            FROM friend_requests
            WHERE (requester_id = @u1 AND receiver_id = @u2)
               OR (requester_id = @u2 AND receiver_id = @u1)
        `);

        if (existingReq.recordset.length > 0) {
            const reqData = existingReq.recordset[0];
            if (reqData.status === 'PENDING') {
                if (reqData.requester_id === requesterId) {
                    return { message: 'Bạn đã gửi lời mời kết bạn trước đó rồi.' };
                } else {
                    // Đối phương đã gửi lời mời cho mình -> Tự động chấp nhận luôn!
                    return await this.acceptFriendRequest(requesterId, receiverId);
                }
            } else if (reqData.status === 'REJECTED') {
                // Cập nhật lại lời mời
                const reqUpdate = new sql.Request();
                reqUpdate.input('id', sql.Int, reqData.id);
                reqUpdate.input('requester_id', sql.Int, requesterId);
                reqUpdate.input('receiver_id', sql.Int, receiverId);
                await reqUpdate.query(`
                    UPDATE friend_requests 
                    SET requester_id = @requester_id, receiver_id = @receiver_id, 
                        status = 'PENDING', updated_at = GETDATE()
                    WHERE id = @id
                `);
                return { message: 'Đã gửi lời mời kết bạn thành công!' };
            }
        }

        // Tạo lời mời mới
        const reqInsert = new sql.Request();
        reqInsert.input('requester_id', sql.Int, requesterId);
        reqInsert.input('receiver_id', sql.Int, receiverId);
        await reqInsert.query(`
            INSERT INTO friend_requests (requester_id, receiver_id, status)
            VALUES (@requester_id, @receiver_id, 'PENDING')
        `);

        return { message: 'Đã gửi lời mời kết bạn thành công!' };
    }

    // 6. CHẤP NHẬN LỜI MỜI KẾT BẠN (TẠO CẶP ĐỐI XỨNG TRONG FRIENDS_WITH AS EDGE)
    async acceptFriendRequest(userId, requesterId) {
        // userId là người nhận (receiver), requesterId là người gửi
        const reqFind = new sql.Request();
        reqFind.input('requester_id', sql.Int, requesterId);
        reqFind.input('receiver_id', sql.Int, userId);
        const findRes = await reqFind.query(`
            SELECT id FROM friend_requests
            WHERE requester_id = @requester_id AND receiver_id = @receiver_id AND status = 'PENDING'
        `);

        if (findRes.recordset.length === 0) {
            const err = new Error('Không tìm thấy lời mời kết bạn hợp lệ để chấp nhận!');
            err.status = 404;
            throw err;
        }

        const reqAccept = new sql.Request();
        reqAccept.input('requester_id', sql.Int, requesterId);
        reqAccept.input('receiver_id', sql.Int, userId);
        await reqAccept.query(`
            BEGIN TRANSACTION;
                UPDATE friend_requests
                SET status = 'ACCEPTED', updated_at = GETDATE()
                WHERE requester_id = @requester_id AND receiver_id = @receiver_id;

                -- Thêm 2 cạnh đồ thị đối xứng vào friends_with AS EDGE
                INSERT INTO friends_with ($from_id, $to_id, since)
                VALUES 
                (
                    (SELECT $node_id FROM users WHERE id = @requester_id),
                    (SELECT $node_id FROM users WHERE id = @receiver_id),
                    GETDATE()
                ),
                (
                    (SELECT $node_id FROM users WHERE id = @receiver_id),
                    (SELECT $node_id FROM users WHERE id = @requester_id),
                    GETDATE()
                );
            COMMIT TRANSACTION;
        `);

        return { message: 'Đã chấp nhận lời mời kết bạn! Hai bạn hiện đã là bạn bè.' };
    }

    // 7. HỦY KẾT BẠN / TỪ CHỐI LỜI MỜI
    async removeFriend(userId, targetId) {
        const req = new sql.Request();
        req.input('u1', sql.Int, userId);
        req.input('u2', sql.Int, targetId);
        await req.query(`
            BEGIN TRANSACTION;
                -- Xóa 2 cạnh bạn bè trong friends_with nếu có
                DELETE f
                FROM users u1, friends_with f, users u2
                WHERE MATCH(u1-(f)->u2)
                  AND ((u1.id = @u1 AND u2.id = @u2) OR (u1.id = @u2 AND u2.id = @u1));

                -- Xóa hoặc cập nhật bảng friend_requests
                DELETE FROM friend_requests
                WHERE (requester_id = @u1 AND receiver_id = @u2)
                   OR (requester_id = @u2 AND receiver_id = @u1);
            COMMIT TRANSACTION;
        `);

        return { message: 'Đã hủy kết bạn / xóa lời mời thành công.' };
    }

    // 8. LẤY DANH SÁCH BẠN BÈ CHÍNH THỨC
    async getFriends(userId) {
        const req = new sql.Request();
        req.input('userId', sql.Int, userId);
        const res = await req.query(`
            SELECT u2.id, u2.username, u2.full_name, u2.avatar, u2.bio, f.since
            FROM users u1, friends_with f, users u2
            WHERE MATCH(u1-(f)->u2)
              AND u1.id = @userId
              AND u2.deleted_at IS NULL
            ORDER BY u2.full_name ASC
        `);
        return res.recordset;
    }

    // 9. LẤY DANH SÁCH BẠN CHUNG (MUTUAL FRIENDS) BẰNG MATCH()
    async getMutualFriends(userA, userB) {
        const req = new sql.Request();
        req.input('userA', sql.Int, userA);
        req.input('userB', sql.Int, userB);
        const res = await req.query(`
            SELECT DISTINCT mutual.id, mutual.username, mutual.full_name, mutual.avatar, mutual.bio
            FROM users u1, friends_with f1, users mutual, friends_with f2, users u2
            WHERE MATCH(u1-(f1)->mutual-(f2)->u2)
              AND u1.id = @userA
              AND u2.id = @userB
              AND mutual.deleted_at IS NULL
            ORDER BY mutual.full_name ASC
        `);
        return res.recordset;
    }

    // 10. THUẬT TOÁN GỢI Ý KẾT BẠN THÔNG MINH (FRIEND SUGGESTIONS) BẰNG MATCH()
    async getFriendSuggestions(userId, limit = 5) {
        const req = new sql.Request();
        req.input('userId', sql.Int, userId);
        req.input('limit', sql.Int, limit);
        const res = await req.query(`
            SELECT TOP (@limit)
                candidate.id,
                candidate.username,
                candidate.full_name,
                candidate.avatar,
                candidate.bio,
                COUNT(DISTINCT mutual.id) AS mutual_count
            FROM users me, friends_with f1, users mutual, friends_with f2, users candidate
            WHERE MATCH(me-(f1)->mutual-(f2)->candidate)
              AND me.id = @userId
              AND candidate.id <> @userId
              AND candidate.deleted_at IS NULL
              -- Không phải người đã là bạn bè
              AND NOT EXISTS (
                  SELECT 1 FROM friends_with fw 
                  WHERE MATCH(me-(fw)->candidate)
              )
              -- Không phải người đang có lời mời kết bạn PENDING
              AND NOT EXISTS (
                  SELECT 1 FROM friend_requests fr
                  WHERE ((fr.requester_id = @userId AND fr.receiver_id = candidate.id) 
                      OR (fr.requester_id = candidate.id AND fr.receiver_id = @userId))
                    AND fr.status = 'PENDING'
              )
            GROUP BY candidate.id, candidate.username, candidate.full_name, candidate.avatar, candidate.bio
            ORDER BY mutual_count DESC, candidate.id ASC
        `);
        return res.recordset;
    }

    // 11. DỮ LIỆU ĐỒ THỊ MẠNG LƯỚI CHO VISUAL GRAPH MODAL (NODES & EDGES CHO D3/VIS-NETWORK)
    async getSocialNetworkGraph(userId) {
        const req = new sql.Request();
        req.input('userId', sql.Int, userId);
        
        // 1. Lấy thông tin user hiện tại
        const meRes = await req.query('SELECT id, username, full_name, avatar FROM users WHERE id = @userId');
        const me = meRes.recordset[0];
        if (!me) throw new Error('Không tìm thấy người dùng!');

        // 2. Lấy danh sách bạn bè trực tiếp
        const friends = await this.getFriends(userId);

        // 3. Lấy các liên kết bạn bè giữa các người bạn với nhau (Friends of Friends connections)
        const connectionsRes = await req.query(`
            SELECT DISTINCT u1.id AS source, u2.id AS target
            FROM users me, friends_with f_me1, users u1, friends_with f_link, users u2, friends_with f_me2
            WHERE MATCH(me-(f_me1)->u1-(f_link)->u2)
              AND me.id = @userId
              AND u1.id < u2.id
              AND EXISTS (
                  SELECT 1 FROM friends_with fw WHERE MATCH(me-(fw)->u2)
              )
        `);

        const nodes = [
            { id: me.id, label: me.full_name || me.username, group: 'me', avatar: me.avatar },
            ...friends.map(f => ({
                id: f.id,
                label: f.full_name || f.username,
                group: 'friend',
                avatar: f.avatar
            }))
        ];

        const edges = [
            ...friends.map(f => ({ from: me.id, to: f.id, label: 'bạn bè' })),
            ...connectionsRes.recordset.map(c => ({ from: c.source, to: c.target, label: 'bạn chung' }))
        ];

        return { nodes, edges };
    }
}

module.exports = new SocialService();
