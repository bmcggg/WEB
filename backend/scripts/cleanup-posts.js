require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });
const fs = require('node:fs/promises');
const path = require('node:path');
const { connectDB, sql } = require('../config/database');
const service = require('../services/postService');
const { cleanupDirectory, removeFiles } = require('../utils/postFiles');

async function run() {
    await connectDB();
    try {
        const entries = await fs.readdir(cleanupDirectory).catch((error) => {
            if (error.code === 'ENOENT') return [];
            throw error;
        });
        for (const entry of entries.filter((name) => /^[a-f0-9-]+\.json$/.test(name))) {
            const target = path.join(cleanupDirectory, entry);
            const job = JSON.parse(await fs.readFile(target, 'utf8'));
            await removeFiles(await service.unreferencedFiles(job.keys));
            await fs.unlink(target);
        }
        console.log('Cleanup queue processed. Unresolved files remain queued.');
    } finally {
        await sql.close();
    }
}

run().catch((error) => { console.error('Cleanup failed:', error.code || error.message); process.exitCode = 1; });
