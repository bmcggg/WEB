const socialService = require('../services/socialService');

class SocialController {
    // POST /api/social/follow/:id
    async followUser(req, res) {
        try {
            const targetId = parseInt(req.params.id, 10);
            if (isNaN(targetId) || targetId <= 0) {
                return res.status(400).json({ error: 'ID người dùng không hợp lệ!' });
            }
            const result = await socialService.followUser(req.user.id, targetId);
            res.json(result);
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // DELETE /api/social/follow/:id
    async unfollowUser(req, res) {
        try {
            const targetId = parseInt(req.params.id, 10);
            if (isNaN(targetId) || targetId <= 0) {
                return res.status(400).json({ error: 'ID người dùng không hợp lệ!' });
            }
            const result = await socialService.unfollowUser(req.user.id, targetId);
            res.json(result);
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // GET /api/social/followers/:id
    async getFollowers(req, res) {
        try {
            const targetId = parseInt(req.params.id, 10);
            if (isNaN(targetId) || targetId <= 0) {
                return res.status(400).json({ error: 'ID người dùng không hợp lệ!' });
            }
            const followers = await socialService.getFollowers(targetId);
            res.json({ data: followers });
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // GET /api/social/following/:id
    async getFollowing(req, res) {
        try {
            const targetId = parseInt(req.params.id, 10);
            if (isNaN(targetId) || targetId <= 0) {
                return res.status(400).json({ error: 'ID người dùng không hợp lệ!' });
            }
            const following = await socialService.getFollowing(targetId);
            res.json({ data: following });
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // POST /api/social/friends/request/:id
    async sendFriendRequest(req, res) {
        try {
            const targetId = parseInt(req.params.id, 10);
            if (isNaN(targetId) || targetId <= 0) {
                return res.status(400).json({ error: 'ID người dùng không hợp lệ!' });
            }
            const result = await socialService.sendFriendRequest(req.user.id, targetId);
            res.json(result);
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // PUT /api/social/friends/accept/:id
    async acceptFriendRequest(req, res) {
        try {
            const requesterId = parseInt(req.params.id, 10);
            if (isNaN(requesterId) || requesterId <= 0) {
                return res.status(400).json({ error: 'ID người dùng không hợp lệ!' });
            }
            const result = await socialService.acceptFriendRequest(req.user.id, requesterId);
            res.json(result);
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // DELETE /api/social/friends/:id
    async removeFriend(req, res) {
        try {
            const targetId = parseInt(req.params.id, 10);
            if (isNaN(targetId) || targetId <= 0) {
                return res.status(400).json({ error: 'ID người dùng không hợp lệ!' });
            }
            const result = await socialService.removeFriend(req.user.id, targetId);
            res.json(result);
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // GET /api/social/friends/:id
    async getFriends(req, res) {
        try {
            const targetId = parseInt(req.params.id, 10);
            if (isNaN(targetId) || targetId <= 0) {
                return res.status(400).json({ error: 'ID người dùng không hợp lệ!' });
            }
            const friends = await socialService.getFriends(targetId);
            res.json({ data: friends });
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // GET /api/social/friends/mutual/:id
    async getMutualFriends(req, res) {
        try {
            const targetId = parseInt(req.params.id, 10);
            if (isNaN(targetId) || targetId <= 0) {
                return res.status(400).json({ error: 'ID người dùng không hợp lệ!' });
            }
            const mutualFriends = await socialService.getMutualFriends(req.user.id, targetId);
            res.json({ data: mutualFriends });
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // GET /api/social/friends/suggestions
    async getFriendSuggestions(req, res) {
        try {
            const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 5));
            const suggestions = await socialService.getFriendSuggestions(req.user.id, limit);
            res.json({ data: suggestions });
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }

    // GET /api/social/graph/:id
    async getSocialNetworkGraph(req, res) {
        try {
            const targetId = parseInt(req.params.id, 10) || req.user.id;
            const graph = await socialService.getSocialNetworkGraph(targetId);
            res.json({ data: graph });
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    }
}

module.exports = new SocialController();
