const express = require('express');
const router = express.Router();
const reactionController = require('../controllers/reactionController');

// GET /api/reactions/post/:postId
// GET /api/reactions/comment/:commentId
// GET /api/reactions/story/:storyId
router.get(
    '/:targetType/:targetId',
    reactionController.getReactions
);

// GET /api/reactions/:targetType/:targetId/users
router.get(
    '/:targetType/:targetId/users',
    reactionController.getReactionUsers
);

// POST /api/reactions/toggle
router.post(
    '/toggle',
    reactionController.toggleReaction
);

module.exports = router;
