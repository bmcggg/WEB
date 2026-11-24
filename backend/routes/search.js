const router = require('express').Router();
const authenticate = require('../middlewares/authMiddleware');
const { sql } = require('../config/database');
const postService = require('../services/postService');
const { HttpError, pagination } = require('../utils/postValidation');

function searchQuery(value) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 100) {
        throw new HttpError(400, 'Nhập từ khóa từ 1 đến 100 ký tự.');
    }
    return value.trim();
}

router.use(authenticate);

router.get('/users', async (req, res) => {
    const query = searchQuery(req.query.q);
    const { page, limit, offset } = pagination(req.query);
    const result = await new sql.Request().input('query', sql.NVarChar(100), query)
        .input('offset', sql.Int, offset).input('limit', sql.Int, limit).query(`
            SELECT id, username, full_name, avatar
            FROM users
            WHERE CHARINDEX(@query, username) > 0 OR CHARINDEX(@query, full_name) > 0
            ORDER BY username, id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
            SELECT COUNT(*) AS total FROM users
            WHERE CHARINDEX(@query, username) > 0 OR CHARINDEX(@query, full_name) > 0;
        `);
    const total = result.recordsets[1][0].total;
    res.json({ data: result.recordsets[0], pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

router.get('/posts', async (req, res) => {
    res.json(await postService.list(req.user.id, pagination(req.query), { query: searchQuery(req.query.q) }));
});

module.exports = router;
