const reactionService = require('../services/reactionService');

function validateId(value, fieldName) {
    const id = Number(value);

    if (value === undefined || value === null || value === '' ||!Number.isSafeInteger(id) ||
        id <= 0 ||id > 2147483647) {
        const error = new Error(`${fieldName} không hợp lệ.`);
        error.statusCode = 400;
        throw error;
    }
    return id;
}

function handleError(res, error, defaultMessage) {
    console.error('LỖI REACTION:', error);

    return res.status(error.statusCode || 500).json({
        success: false, message: error.statusCode ? error.message : defaultMessage
    });
}


async function getReactions(req, res) {
    try {
        const { targetType } = req.params;

        const targetId = validateId( req.params.targetId, 'ID đối tượng');

        let userId = null;

        if (req.query.userId !== undefined && req.query.userId !== '')
            userId = validateId(req.query.userId, 'User ID');
        
        const data = await reactionService.getReactionStats( targetType, targetId, userId);

        return res.json({success: true, data});
    } catch (error) {
        return handleError(res, error, 'Lỗi khi tải reactions.');
    }
}

async function getReactionUsers(req, res) {
    try {
        const { targetType } = req.params;
        const targetId = validateId( req.params.targetId, 'ID đối tượng');
        const data = await reactionService.getReactionUsers( targetType, targetId);

        return res.json({success: true, data});
    } catch (error) {
        return handleError( res, error, 'Không thể lấy danh sách người reaction.');
    }
}

async function toggleReaction(req, res) {
    try {
        const { user_id, post_id, comment_id, story_id, type} = req.body;

        const targets = [
            { type: 'post', value: post_id },
            { type: 'comment', value: comment_id },
            { type: 'story', value: story_id }
        ].filter(item => item.value !== undefined && item.value !== null);

        if (targets.length !== 1)
            return res.status(400).json({
                success: false, message: 'Chỉ được cung cấp một trong post_id, comment_id hoặc story_id.'
            });
        
        const userId = validateId(user_id, 'User ID');
        const targetId = validateId( targets[0].value, 'ID đối tượng');
        const targetType = targets[0].type;
        const reactionType = String(type || '').toUpperCase();

        if (!reactionService.VALID_TYPES.includes(reactionType)) 
            return res.status(400).json({
                success: false, message: 'Loại reaction không hợp lệ.'
            });
        

        const data = await reactionService.toggleReaction({
            userId, targetType, targetId, type: reactionType
        });

        return res.json({
            success: true, message: data.message,
            data: {
                userReaction: data.userReaction
            }
        });
    } catch (error) {
        return handleError(
            res,
            error,
            'Lỗi khi cập nhật reaction.'
        );
    }
}

module.exports = {
    getReactions,
    getReactionUsers,
    toggleReaction
};
