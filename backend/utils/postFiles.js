const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const storageRoot = path.resolve(process.env.POST_STORAGE_DIR || path.join(__dirname, '../storage'));
const postDirectory = path.join(storageRoot, 'posts');
const cleanupDirectory = path.join(storageRoot, 'cleanup');
const avatarDirectory = path.resolve(__dirname, '../public/uploads');

for (const publicRoot of [path.resolve(__dirname, '../public'), path.resolve(__dirname, '../../frontend')]) {
    const relative = path.relative(publicRoot, storageRoot);
    if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
        throw new Error('POST_STORAGE_DIR must be outside public/frontend directories.');
    }
}

function filePath(key) {
    if (/^posts\/[a-f0-9-]+\.(jpg|png|webp|pdf)$/.test(key)) return path.join(storageRoot, key);
    if (/^\/uploads\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(key)) return path.join(avatarDirectory, path.basename(key));
    return null;
}

async function queueCleanup(keys) {
    if (!keys.length) return;
    await fs.mkdir(cleanupDirectory, { recursive: true });
    await fs.writeFile(path.join(cleanupDirectory, `${randomUUID()}.json`), JSON.stringify({ keys, createdAt: new Date().toISOString() }), { mode: 0o600 });
}

async function removeFiles(keys) {
    const failed = [];
    for (const key of new Set(keys)) {
        const target = filePath(key);
        if (!target) {
            failed.push(key);
            continue;
        }
        try {
            await fs.unlink(target);
        } catch (error) {
            if (error.code !== 'ENOENT') failed.push(key);
        }
    }
    if (failed.length) {
        await queueCleanup(failed);
        console.error('Media cleanup pending:', failed.length, 'files; run npm run cleanup:posts.');
    }
    return failed.length > 0;
}

module.exports = { storageRoot, postDirectory, cleanupDirectory, filePath, removeFiles, queueCleanup };
