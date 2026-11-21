const notificationService = require('../services/notificationService');
const { positiveInteger } = require('../utils/postValidation');

function success(res, data) {
    return res.json({ success: true, data });
}

function failure(res, error, defaultMessage) {
    console.error('Lỗi thông báo:', error);
    const status = error.status || error.statusCode || 500;
    const message = status === 500 ? defaultMessage : error.message;
    return res.status(status).json({ success: false, error: message, message });
}

exports.getNotifications = async (req, res) => {
    try {
        const result = await notificationService.listNotifications(req.user.id);
        return res.json({
            success: true,
            data: result.items,
            unread_count: result.unread_count,
        });
    } catch (error) {
        return failure(res, error, 'Không thể tải thông báo.');
    }
};

exports.markRead = async (req, res) => {
    try {
        const id = positiveInteger(req.params.id, 'Notification ID');
        return success(res, await notificationService.markNotificationRead(id, req.user.id));
    } catch (error) {
        return failure(res, error, 'Không thể cập nhật thông báo.');
    }
};

exports.markAllRead = async (req, res) => {
    try {
        return success(res, await notificationService.markAllNotificationsRead(req.user.id));
    } catch (error) {
        return failure(res, error, 'Không thể cập nhật thông báo.');
    }
};
