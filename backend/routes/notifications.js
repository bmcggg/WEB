const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const controller = require('../controllers/notificationController');

router.use(authenticate);

router.patch('/read-all', controller.markAllRead);
router.get('/', controller.getNotifications);
router.patch('/:id/read', controller.markRead);

module.exports = router;
