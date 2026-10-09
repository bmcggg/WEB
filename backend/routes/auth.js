const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../utils/upload');

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/update-avatar', upload.single('avatar'), (req, res) => authController.updateAvatar(req, res));
router.get('/profile/:id', (req, res) => authController.getProfile(req, res));

module.exports = router;