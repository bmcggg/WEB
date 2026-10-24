class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function positiveInteger(value, label, max = 2147483647) {
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > max) {
        throw new HttpError(400, `${label} khong hop le.`);
    }
    return Number(value);
}

function pagination(query) {
    const page = positiveInteger(query.page ?? 1, 'page', 1000000);
    const limit = positiveInteger(query.limit ?? 10, 'limit', 50);
    return { page, limit, offset: (page - 1) * limit };
}

function postInput(body, { patch = false, hasMedia = false } = {}) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Du lieu khong hop le.');
    const allowed = patch ? ['content', 'privacy'] : ['content', 'privacy', 'user_id'];
    if (Object.keys(body).some((key) => !allowed.includes(key))) throw new HttpError(400, 'Truong du lieu khong duoc ho tro.');
    const result = {};
    if (Object.hasOwn(body, 'content')) {
        if (typeof body.content !== 'string' || body.content.length > 10000) throw new HttpError(400, 'Noi dung toi da 10000 ky tu.');
        result.content = body.content.trim();
    } else if (!patch) result.content = '';
    if (Object.hasOwn(body, 'privacy')) {
        if (!['PUBLIC', 'PRIVATE'].includes(body.privacy)) throw new HttpError(400, 'Chi ho tro PUBLIC hoac PRIVATE.');
        result.privacy = body.privacy;
    } else if (!patch) result.privacy = 'PUBLIC';
    if (patch && !Object.keys(result).length) throw new HttpError(400, 'Khong co noi dung can cap nhat.');
    if (!patch && !result.content && !hasMedia) throw new HttpError(400, 'Bai viet khong duoc de trong.');
    return result;
}

module.exports = { HttpError, positiveInteger, pagination, postInput };
