const storyService = require('../services/storyService');
const postService = require('../services/postService');
const { removeFiles } = require('./postFiles');

let cleanupTimer = null;
let cleanupRunning = false;

// Xử lý Story hết hạn
async function cleanupExpiredStories() {
    if (cleanupRunning) return;

    cleanupRunning = true;

    try {
        // Xóa Story hết hạn khỏi database
        const expiredFiles = await storyService.deleteExpiredStories();

        if (!expiredFiles.length) {
            return;
        }

        // Chỉ lấy file không còn được sử dụng ở nơi khác
        const removableFiles = await postService.unreferencedFiles(
            expiredFiles
        );

        // Xóa file vật lý
        const cleanupPending = await removeFiles(removableFiles);

        console.log(
            `Story cleanup: ${expiredFiles.length} Story hết hạn, ` +
            `${removableFiles.length} file được kiểm tra, ` +
            `cleanupPending=${cleanupPending}`
        );

    } catch (error) {
        console.error(
            'Story cleanup failed:',
            error.code || error.message || 'CLEANUP_ERROR'
        );

    } finally {
        cleanupRunning = false;
    }
}

// Khởi chạy lịch dọn dẹp
function startStoryCleanup() {
    if (cleanupTimer) return;

    // Chạy một lần khi server khởi động
    cleanupExpiredStories();

    // Sau đó chạy định kỳ mỗi 15 phút
    cleanupTimer = setInterval(
        cleanupExpiredStories,
        15 * 60 * 1000
    );

    cleanupTimer.unref?.();

    console.log('Story cleanup scheduler started.');
}

// Dừng lịch dọn dẹp nếu cần
function stopStoryCleanup() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
    }
}

module.exports = {
    cleanupExpiredStories,
    startStoryCleanup,
    stopStoryCleanup
};