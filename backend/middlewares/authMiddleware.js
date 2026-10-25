const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');

module.exports = function authenticate(req, res, next) {
    const cookieToken = req.cookies?.fella_token;
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
    const token = cookieToken || (match ? match[1] : null);

    if (!token) return res.status(401).json({ error: 'Vui long dang nhap.' });
    try {
        const user = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
        if (!Number.isInteger(user.id) || user.id < 1 || user.id > 2147483647) {
            return res.status(401).json({ error: 'Phien dang nhap khong hop le.' });
        }
        req.user = user;
        res.set('Cache-Control', 'private, no-store');
        next();
    } catch {
        res.status(401).json({ error: 'Phien dang nhap khong hop le hoac da het han.' });
    }
};
