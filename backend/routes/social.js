const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const authenticate = require('../middlewares/authMiddleware');

// --- Routes Theo dõi (Follows) ---
router.post('/follow/:id', authenticate, (req, res) => socialController.followUser(req, res));
router.delete('/follow/:id', authenticate, (req, res) => socialController.unfollowUser(req, res));
router.get('/followers/:id', (req, res) => socialController.getFollowers(req, res));
router.get('/following/:id', (req, res) => socialController.getFollowing(req, res));

// --- Routes Bạn bè & Bạn chung (Friends & Graph) ---
router.post('/friends/request/:id', authenticate, (req, res) => socialController.sendFriendRequest(req, res));
router.put('/friends/accept/:id', authenticate, (req, res) => socialController.acceptFriendRequest(req, res));
router.delete('/friends/:id', authenticate, (req, res) => socialController.removeFriend(req, res));
router.get('/friends/suggestions', authenticate, (req, res) => socialController.getFriendSuggestions(req, res));
router.get('/friends/mutual/:id', authenticate, (req, res) => socialController.getMutualFriends(req, res));
router.get('/friends/:id', (req, res) => socialController.getFriends(req, res));

// --- Route Đồ thị mạng lưới trực quan ---
router.get('/graph/:id', authenticate, (req, res) => socialController.getSocialNetworkGraph(req, res));

module.exports = router;
