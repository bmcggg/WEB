const Redis = require('ioredis');

const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 2
});

redis.on('connect', () => console.log('✅ Đã kết nối Redis'));
redis.on('error', (err) => console.error('❌ Lỗi kết nối Redis:', err.message));

module.exports = redis;
