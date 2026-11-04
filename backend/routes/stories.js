
const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const controller = require('../controllers/storyController');
const { postUpload } = require('../utils/postUpload');

router.use(authenticate);

router.get('/', controller.getStories);

router.post('/', postUpload, controller.createStory);

router.get('/:id/media', controller.getMedia);

router.delete('/:id', controller.deleteStory);

module.exports = router;
