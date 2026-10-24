const express = require('express');
const authenticate = require('../middlewares/authMiddleware');
const controller = require('../controllers/postController');
const { postUpload } = require('../utils/postUpload');

const router = express.Router();
router.use(authenticate);
router.get('/', controller.getAllPosts);
router.post('/', postUpload, controller.createPost);
router.get('/saved', controller.getSavedPosts);
router.get('/user/:id', controller.getUserPosts);
router.get('/:id/media/:mediaId', controller.getMedia);
router.get('/:id', controller.getPost);
router.patch('/:id', controller.updatePost);
router.delete('/:id', controller.deletePost);
router.post('/:id/save', controller.savePost);
router.delete('/:id/save', controller.unsavePost);

module.exports = router;
