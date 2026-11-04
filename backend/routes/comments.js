const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authMiddleware');
const controller = require('../controllers/commentController');
const { postUpload } = require('../utils/postUpload');

router.use(authenticate);

router.get('/post/:postId', controller.getCommentsByPost);
router.post('/toggle', controller.toggleReaction);
router.post('/', postUpload, controller.createComment);
router.delete('/:id', controller.deleteComment);
router.get('/:id/media/:mediaId', controller.getMedia);

module.exports = router;