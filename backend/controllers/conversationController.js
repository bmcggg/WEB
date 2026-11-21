const conversationService = require('../services/conversationService');
const { positiveInteger } = require('../utils/postValidation');

function success(res, data, status = 200) {
    return res.status(status).json({ success: true, data });
}

function failure(res, error, defaultMessage) {
    console.error('Lỗi chat:', error);
    const status = error.status || error.statusCode || 500;
    const message = status === 500 ? defaultMessage : error.message;
    return res.status(status).json({ success: false, error: message, message });
}

exports.getConversations = async (req, res) => {
    try {
        return success(res, await conversationService.listConversations(req.user.id));
    } catch (error) {
        return failure(res, error, 'Không thể tải danh sách cuộc trò chuyện.');
    }
};

exports.searchUsers = async (req, res) => {
    try {
        return success(res, await conversationService.searchUsers(req.user.id, req.query.q));
    } catch (error) {
        return failure(res, error, 'Không thể tìm kiếm người dùng.');
    }
};

exports.createConversation = async (req, res) => {
    try {
        const conversation = await conversationService.createConversation(req.user.id, req.body);
        return success(res, conversation, 201);
    } catch (error) {
        return failure(res, error, 'Không thể tạo cuộc trò chuyện.');
    }
};

exports.getMessages = async (req, res) => {
    try {
        const conversationId = positiveInteger(req.params.id, 'Conversation ID');
        return success(res, await conversationService.getMessages(conversationId, req.user.id));
    } catch (error) {
        return failure(res, error, 'Không thể tải tin nhắn.');
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const conversationId = positiveInteger(req.params.id, 'Conversation ID');
        const message = await conversationService.createMessage(conversationId, req.user.id, req.body);
        return success(res, message, 201);
    } catch (error) {
        return failure(res, error, 'Không thể gửi tin nhắn.');
    }
};

exports.markRead = async (req, res) => {
    try {
        const conversationId = positiveInteger(req.params.id, 'Conversation ID');
        return success(res, await conversationService.markConversationRead(conversationId, req.user.id));
    } catch (error) {
        return failure(res, error, 'Không thể cập nhật trạng thái đã đọc.');
    }
};
