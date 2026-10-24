function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'fallback_secret_key') {
        throw new Error('JWT_SECRET must be configured with a private secret.');
    }
    return secret;
}

module.exports = { getJwtSecret };
