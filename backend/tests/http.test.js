const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const jwt = require('jsonwebtoken');

test('HTTP auth, upload validation and failure cleanup (service mocked)', async (context) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fella-http-'));
    process.env.POST_STORAGE_DIR = root;
    process.env.JWT_SECRET = 'test-only-secret-not-for-production';
    const service = require('../services/postService');
    const createApp = require('../app');
    const server = createApp().listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    const token = jwt.sign({ id: 7, username: 'tester', role: 'USER' }, process.env.JWT_SECRET);
    context.after(async () => {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
        await fs.rm(root, { recursive: true, force: true });
    });
    const request = (endpoint, options = {}, bearer = token) => fetch(base + endpoint, { ...options, headers: { ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}), ...options.headers } });
    for (const bearer of [null, 'fake', jwt.sign({ id: 7 }, 'wrong-secret'), jwt.sign({ id: 7 }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
        assert.equal((await request('/api/posts', {}, bearer)).status, 401);
    }
    assert.equal((await request('/api/posts?page=0')).status, 400);
    assert.equal((await request('/api/posts/abc')).status, 400);
    assert.equal((await request('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' })).status, 400);
    assert.equal((await request('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 400);
    context.mock.method(service, 'createPost', async (viewer, input, media) => ({ id: 10, user_id: viewer, ...input, media }));
    const created = await request('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: 'hello', user_id: 999 }) });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).data.user_id, 7);

    const upload = async (name, buffer, mime, count = 1) => {
        const body = new FormData();
        for (let index = 0; index < count; index++) body.append('media', new Blob([buffer], { type: mime }), name);
        return request('/api/posts', { method: 'POST', body });
    };
    assert.equal((await upload('bad.exe', 'MZ', 'application/octet-stream')).status, 415);
    assert.equal((await upload('fake.png', '<html>bad</html>', 'image/png')).status, 415);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Z2QAAAAASUVORK5CYII=', 'base64');
    assert.equal((await upload('image.png', png, 'image/png', 6)).status, 400);
    assert.equal((await upload('large.png', Buffer.alloc(10 * 1024 * 1024 + 1), 'image/png')).status, 413);
    assert.equal((await fs.readdir(path.join(root, 'posts'))).length, 0);
    service.createPost.mock.mockImplementation(async () => { throw new Error('private SQL details'); });
    const failed = await upload('image.png', png, 'image/png');
    assert.equal(failed.status, 500);
    assert.doesNotMatch(await failed.text(), /private SQL details/);
    assert.equal((await fs.readdir(path.join(root, 'posts'))).length, 0);
    const successful = context.mock.method(service, 'list', async () => ({ data: [], pagination: { total: 0 } }));
    assert.equal((await request('/api/posts/saved')).status, 200);
    assert.equal(successful.mock.calls[0].arguments[2].saved, true);
    assert.equal((await request('/storage/posts/secret.png', {}, null)).status, 404);
});
