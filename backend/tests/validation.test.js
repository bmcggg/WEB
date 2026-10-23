const test = require('node:test');
const assert = require('node:assert/strict');
const { postInput, pagination, positiveInteger } = require('../utils/postValidation');
const { validSignature } = require('../utils/postUpload');
const { filePath } = require('../utils/postFiles');

test('input validation rejects empty, malformed and forbidden changes', () => {
    for (const body of [{}, { content: '  ' }, { content: 42 }, { content: 'x'.repeat(10001) }, { content: 'ok', privacy: 'FRIENDS' }]) {
        assert.throws(() => postInput(body), { status: 400 });
    }
    for (const field of ['id', 'user_id', 'created_at', 'media']) assert.throws(() => postInput({ [field]: 1 }, { patch: true }), { status: 400 });
    assert.deepEqual(postInput({ content: ' hi ', user_id: 999 }), { content: 'hi', privacy: 'PUBLIC' });
    assert.deepEqual(postInput({}, { hasMedia: true }), { content: '', privacy: 'PUBLIC' });
    assert.deepEqual(postInput({ content: 'change' }, { patch: true }), { content: 'change' });
});

test('pagination and IDs reject SQL fragments, duplicates and out of range values', () => {
    for (const value of ['0', '-1', '1.5', '1;DROP TABLE posts', ['1', '2'], '2147483648']) assert.throws(() => positiveInteger(value, 'id'), { status: 400 });
    assert.deepEqual(pagination({}), { page: 1, limit: 10, offset: 0 });
    assert.deepEqual(pagination({ page: '2', limit: '5' }), { page: 2, limit: 5, offset: 5 });
    assert.throws(() => pagination({ limit: '51' }), { status: 400 });
});

test('file signatures reject executable content disguised as images or PDF', () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Z2QAAAAASUVORK5CYII=', 'base64');
    assert.equal(validSignature(png, 'image/png'), true);
    for (const mime of ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']) {
        assert.equal(validSignature(Buffer.from('<script>alert(1)</script>'), mime), false);
    }
    assert.equal(validSignature(Buffer.from('%PDF-1.7\n%%EOF\n'), 'application/pdf'), true);
    assert.equal(validSignature(Buffer.from('%PDF-1.7\ntruncated'), 'application/pdf'), false);
});

test('storage keys cannot escape storage or refer to executable files', () => {
    for (const key of ['../.env', 'posts/../../.env', '/etc/passwd', 'posts/abc.html', '/uploads/../secret', 'https://other/secret']) assert.equal(filePath(key), null);
    assert.ok(filePath('posts/abcdef-123.pdf').endsWith('posts/abcdef-123.pdf'));
});
