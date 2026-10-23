const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const enabled = process.env.RUN_SQL_TESTS === '1';

test('SQL Server integration: real HTTP, two users, media, privacy and transactions', { skip: !enabled }, async (context) => {
    if (!/^Fella_Test_[A-Za-z0-9_]+$/.test(process.env.DB_DATABASE || '')) throw new Error('DB_DATABASE must start with Fella_Test_ and identify a disposable test database.');
    const storage = await fs.mkdtemp(path.join(os.tmpdir(), 'fella-sql-'));
    process.env.POST_STORAGE_DIR = storage;
    process.env.JWT_SECRET = randomUUID() + randomUUID();
    const { sql, connectDB } = require('../../config/database');
    const initDatabase = require('../../config/database-init');
    const createApp = require('../../app');
    let server;
    const userIds = [];
    const avatarFiles = [];
    context.after(async () => {
        if (server) {
            server.closeAllConnections();
            await new Promise((resolve) => server.close(resolve));
        }
        for (const id of userIds) {
            await new sql.Request().input('id', sql.Int, id).query(`
                DELETE FROM notifications WHERE sender_id = @id OR receiver_id = @id;
                DELETE FROM saved_posts WHERE user_id = @id OR post_id IN (SELECT id FROM posts WHERE user_id = @id);
                DELETE FROM reactions WHERE user_id = @id OR post_id IN (SELECT id FROM posts WHERE user_id = @id);
                DELETE FROM comments WHERE user_id = @id;
                DELETE FROM shares WHERE user_id = @id;
                DELETE FROM posts WHERE user_id = @id;
                DELETE FROM users WHERE id = @id;
            `).catch(() => {});
        }
        await sql.close();
        for (const avatar of avatarFiles) await fs.unlink(avatar).catch(() => {});
        await fs.rm(storage, { recursive: true, force: true });
    });
    await initDatabase();
    await connectDB();
    server = createApp().listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    const call = async (endpoint, { token, method = 'GET', json, form } = {}) => {
        const response = await fetch(base + '/api' + endpoint, {
            method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(json ? { 'Content-Type': 'application/json' } : {}) },
            body: form || (json ? JSON.stringify(json) : undefined),
        });
        const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer());
        return { status: response.status, data, headers: response.headers };
    };
    const suffix = randomUUID().slice(0, 8);
    const accounts = [];
    await context.test('registration and login remain compatible', async () => {
        for (const label of ['a', 'b']) {
            const username = 'test_' + suffix + '_' + label;
            const registration = await call('/auth/register', { method: 'POST', json: { username, email: username + '@example.test', password: 'FellaTest_42!', full_name: 'Test ' + label } });
            assert.equal(registration.status, 201);
            userIds.push(registration.data.userId);
            const login = await call('/auth/login', { method: 'POST', json: { account: username, password: 'FellaTest_42!' } });
            assert.equal(login.status, 200);
            assert.ok(login.data.token);
            assert.equal(login.data.user.password, undefined);
            accounts.push(login.data);
            assert.equal((await call('/auth/profile/' + login.data.user.id, { token: login.data.token })).status, 200);
        }
    });
    const [alice, bob] = accounts;
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Z2QAAAAASUVORK5CYII=', 'base64');
    const upload = (items, fields = {}) => {
        const form = new FormData();
        for (const [key, value] of Object.entries(fields)) form.append(key, value);
        for (const item of items) form.append('media', new Blob([item.buffer], { type: item.mime }), item.name);
        return form;
    };
    let publicPost;
    let privatePost;
    await context.test('avatar upload and public avatar URL remain compatible', async () => {
        const form = new FormData();
        form.append('userId', alice.user.id);
        form.append('avatar', new Blob([png], { type: 'image/png' }), 'avatar.png');
        const result = await call('/auth/update-avatar', { token: alice.token, method: 'POST', form });
        assert.equal(result.status, 200);
        avatarFiles.push(path.join(__dirname, '../../public', result.data.avatar));
        const loaded = await fetch(base + result.data.avatar);
        assert.equal(loaded.status, 200);
        assert.deepEqual(Buffer.from(await loaded.arrayBuffer()), png);
        assert.equal((await call('/auth/profile/' + alice.user.id, { token: alice.token })).data.data.avatar, result.data.avatar);
    });
    await context.test('create JSON and multipart text/image/PDF, check persisted metadata', async () => {
        const text = await call('/posts', { token: alice.token, method: 'POST', json: { content: 'hello SQL', user_id: bob.user.id } });
        assert.equal(text.status, 201);
        assert.equal(text.data.data.user_id, alice.user.id);
        const image = { buffer: png, mime: 'image/png', name: 'image.png' };
        const pdf = { buffer: Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n'), mime: 'application/pdf', name: 'file.pdf' };
        for (const items of [[image], [image, image], [pdf], [image, pdf]]) {
            const result = await call('/posts', { token: alice.token, method: 'POST', form: upload(items, { content: items.length > 1 ? 'mixed media' : '', privacy: 'PUBLIC' }) });
            assert.equal(result.status, 201, JSON.stringify(result.data));
            assert.equal(result.data.data.media.length, items.length);
            publicPost = result.data.data;
        }
        const result = await call('/posts', { token: alice.token, method: 'POST', form: upload([image], { privacy: 'PRIVATE' }) });
        assert.equal(result.status, 201);
        privatePost = result.data.data;
        const stored = await new sql.Request().input('id', sql.Int, publicPost.id).query('SELECT media_url FROM post_media WHERE post_id = @id');
        assert.equal(stored.recordset.length, 2);
        for (const item of stored.recordset) await fs.access(path.join(storage, item.media_url));
    });
    await context.test('feed and profile are paginated, ordered and privacy-filtered', async () => {
        const first = await call('/posts?limit=2&page=1', { token: bob.token });
        const second = await call('/posts?limit=2&page=2', { token: bob.token });
        assert.equal(first.status, 200);
        assert.equal(first.data.data.length, 2);
        assert.ok(first.data.data.every((post) => post.privacy === 'PUBLIC'));
        assert.ok(first.data.data.every((post) => !second.data.data.some((other) => other.id === post.id)));
        const ordered = [...first.data.data, ...second.data.data];
        for (let index = 1; index < ordered.length; index++) {
            const previousTime = new Date(ordered[index - 1].created_at).getTime();
            const currentTime = new Date(ordered[index].created_at).getTime();
            assert.ok(previousTime > currentTime || (previousTime === currentTime && ordered[index - 1].id > ordered[index].id));
        }
        const profile = await call('/posts/user/' + alice.user.id, { token: bob.token });
        assert.ok(profile.data.data.every((post) => post.id !== privatePost.id));
        const own = await call('/posts/user/' + alice.user.id, { token: alice.token });
        assert.ok(own.data.data.some((post) => post.id === privatePost.id));
        assert.equal((await call('/posts/' + publicPost.id, { token: bob.token })).status, 200);
        assert.equal((await call('/posts/' + privatePost.id, { token: bob.token })).status, 404);
    });
    await context.test('media checks JWT, ownership, post association and does not leak storage', async () => {
        const mediaUrl = publicPost.media[0].media_url.slice(4);
        const successful = await call(mediaUrl, { token: bob.token });
        assert.equal(successful.status, 200);
        assert.deepEqual(successful.data, png);
        assert.equal(successful.headers.get('cache-control'), 'private, no-store');
        assert.equal((await call(mediaUrl)).status, 401);
        assert.equal((await call(privatePost.media[0].media_url.slice(4), { token: bob.token })).status, 404);
        assert.equal((await call('/posts/' + privatePost.id + '/media/' + publicPost.media[0].id, { token: alice.token })).status, 404);
        const hidden = await fetch(base + '/uploads/' + (await new sql.Request().input('id', sql.Int, publicPost.id).query('SELECT TOP 1 media_url FROM post_media WHERE post_id = @id')).recordset[0].media_url);
        assert.equal(hidden.status, 404);
    });
    await context.test('ownership, partial edits, invalid fields and legacy FRIENDS', async () => {
        assert.equal((await call('/posts/' + publicPost.id, { token: bob.token, method: 'PATCH', json: { content: 'hijack' } })).status, 403);
        assert.equal((await call('/posts/' + publicPost.id, { token: bob.token, method: 'DELETE' })).status, 403);
        assert.equal((await call('/posts/' + publicPost.id, { token: alice.token, method: 'PATCH', json: { user_id: bob.user.id } })).status, 400);
        const edited = await call('/posts/' + publicPost.id, { token: alice.token, method: 'PATCH', json: { content: 'updated content' } });
        assert.equal(edited.data.data.content, 'updated content');
        assert.equal(edited.data.data.media.length, 2);
        await new sql.Request().input('id', sql.Int, privatePost.id).query("UPDATE posts SET privacy = 'FRIENDS' WHERE id = @id");
        const legacy = await call('/posts/' + privatePost.id, { token: alice.token, method: 'PATCH', json: { content: 'keep friends' } });
        assert.equal(legacy.data.data.privacy, 'FRIENDS');
        assert.equal((await call('/posts/' + privatePost.id, { token: bob.token })).status, 404);
        assert.equal((await call(privatePost.media[0].media_url.slice(4), { token: bob.token })).status, 404);
        assert.equal((await call('/posts/' + privatePost.id, { token: alice.token, method: 'PATCH', json: { privacy: 'FRIENDS' } })).status, 400);
    });
    await context.test('concurrent save is idempotent, losing privacy removes saved visibility', async () => {
        const saved = await Promise.all(Array.from({ length: 4 }, () => call('/posts/' + publicPost.id + '/save', { token: bob.token, method: 'POST' })));
        assert.ok(saved.every((result) => result.status === 200));
        const rows = await new sql.Request().input('post', sql.Int, publicPost.id).input('user', sql.Int, bob.user.id).query('SELECT COUNT(*) AS total FROM saved_posts WHERE post_id = @post AND user_id = @user');
        assert.equal(rows.recordset[0].total, 1);
        assert.equal((await call('/posts/saved', { token: bob.token })).data.data.length, 1);
        assert.equal((await call('/posts/saved', { token: alice.token })).data.data.length, 0);
        assert.equal((await call('/posts/' + publicPost.id, { token: alice.token, method: 'PATCH', json: { privacy: 'PRIVATE' } })).status, 200);
        const inaccessible = await call('/posts/saved', { token: bob.token });
        assert.equal(inaccessible.data.data.length, 0);
        assert.equal(inaccessible.data.pagination.total, 0);
        assert.equal((await call('/posts/' + publicPost.id, { token: bob.token })).status, 404);
        assert.equal((await call(publicPost.media[0].media_url.slice(4), { token: bob.token })).status, 404);
        assert.equal((await call('/posts/' + publicPost.id + '/save', { token: bob.token, method: 'POST' })).status, 404);
        for (let iteration = 0; iteration < 2; iteration++) assert.equal((await call('/posts/' + publicPost.id + '/save', { token: bob.token, method: 'DELETE' })).data.is_saved, false);
    });
    await context.test('SQL rollback removes inserted post and uploaded files on metadata failure', async () => {
        const before = await new sql.Request().query('SELECT COUNT(*) AS total FROM posts');
        const filenames = await fs.readdir(path.join(storage, 'posts'));
        await new sql.Request().query("CREATE TRIGGER fella_test_media_failure ON post_media AFTER INSERT AS BEGIN THROW 51000, 'Injected integration failure', 1; END");
        try {
            const result = await call('/posts', { token: alice.token, method: 'POST', form: upload([{ buffer: png, mime: 'image/png', name: 'test.png' }]) });
            assert.equal(result.status, 500);
            assert.equal((await new sql.Request().query('SELECT COUNT(*) AS total FROM posts')).recordset[0].total, before.recordset[0].total);
            assert.deepEqual(await fs.readdir(path.join(storage, 'posts')), filenames);
        } finally { await new sql.Request().query('DROP TRIGGER fella_test_media_failure'); }
    });
    await context.test('delete cleans foreign keys and physical media after commit', async () => {
        const keys = (await new sql.Request().input('id', sql.Int, publicPost.id).query('SELECT media_url FROM post_media WHERE post_id = @id')).recordset.map((item) => item.media_url);
        const commentKey = 'posts/' + randomUUID() + '.png';
        await fs.writeFile(path.join(storage, commentKey), png);
        await new sql.Request().input('id', sql.Int, publicPost.id).input('owner', sql.Int, alice.user.id).input('viewer', sql.Int, bob.user.id).input('key', sql.NVarChar(sql.MAX), commentKey).query(`
            INSERT INTO saved_posts (user_id, post_id) VALUES (@viewer, @id);
            INSERT INTO reactions (user_id, post_id) VALUES (@viewer, @id);
            INSERT INTO shares (post_id, user_id) VALUES (@id, @viewer);
            INSERT INTO comments (post_id, user_id, content) VALUES (@id, @viewer, 'test comment');
            DECLARE @comment INT = SCOPE_IDENTITY();
            INSERT INTO comment_media (comment_id, media_url, media_type) VALUES (@comment, @key, 'IMAGE');
            INSERT INTO notifications (type, sender_id, receiver_id, comment_id) VALUES ('COMMENTED', @viewer, @owner, @comment);
        `);
        const result = await call('/posts/' + publicPost.id, { token: alice.token, method: 'DELETE' });
        assert.equal(result.status, 200, JSON.stringify(result.data));
        assert.equal((await call('/posts/' + publicPost.id, { token: alice.token })).status, 404);
        for (const table of ['posts', 'post_media', 'saved_posts', 'reactions', 'comments', 'shares']) {
            const result = await new sql.Request().input('id', sql.Int, publicPost.id).query('SELECT COUNT(*) AS total FROM ' + table + ' WHERE ' + (table === 'posts' ? 'id' : 'post_id') + ' = @id');
            assert.equal(result.recordset[0].total, 0);
        }
        for (const key of [...keys, commentKey]) await assert.rejects(fs.access(path.join(storage, key)), { code: 'ENOENT' });
        assert.equal((await new sql.Request().input('user', sql.Int, bob.user.id).query('SELECT COUNT(*) AS total FROM notifications WHERE sender_id = @user')).recordset[0].total, 0);
    });
    await context.test('deleting one post preserves a file still referenced by another post', async () => {
        const created = await call('/posts', { token: alice.token, method: 'POST', form: upload([{ buffer: png, mime: 'image/png', name: 'shared.png' }]) });
        const firstId = created.data.postId;
        const key = (await new sql.Request().input('id', sql.Int, firstId).query('SELECT media_url FROM post_media WHERE post_id = @id')).recordset[0].media_url;
        const other = await call('/posts', { token: alice.token, method: 'POST', json: { content: 'second reference' } });
        await new sql.Request().input('post', sql.Int, other.data.postId).input('key', sql.NVarChar(sql.MAX), key)
            .query("INSERT INTO post_media (post_id, media_url, media_type) VALUES (@post, @key, 'IMAGE')");
        assert.equal((await call('/posts/' + firstId, { token: alice.token, method: 'DELETE' })).status, 200);
        await fs.access(path.join(storage, key));
        const detail = await call('/posts/' + other.data.postId, { token: alice.token });
        assert.equal((await call(detail.data.data.media[0].media_url.slice(4), { token: alice.token })).status, 200);
        assert.equal((await call('/posts/' + other.data.postId, { token: alice.token, method: 'DELETE' })).status, 200);
        await assert.rejects(fs.access(path.join(storage, key)), { code: 'ENOENT' });
    });
});
