const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

router.get('/', (req, res) => postController.getAllPosts(req, res));
router.post('/', (req, res) => postController.createPost(req, res));
router.get('/user/:id', (req, res) => postController.getUserPosts(req, res));

module.exports = router;