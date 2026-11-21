const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const controller = require('../controllers/conversationController');

router.use(authenticate);

router.get('/users', controller.searchUsers);
router.get('/', controller.getConversations);
router.post('/', controller.createConversation);
router.get('/:id/messages', controller.getMessages);
router.post('/:id/messages', controller.sendMessage);
router.post('/:id/read', controller.markRead);

module.exports = router;
