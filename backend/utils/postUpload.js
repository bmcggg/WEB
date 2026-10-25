const multer = require('multer');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { postDirectory, removeFiles } = require('./postFiles');
const { HttpError } = require('./postValidation');

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const formats = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.pdf': 'application/pdf'
};
const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, callback) {
            fs.mkdir(postDirectory, { recursive: true }).then(() => callback(null, postDirectory), callback);
        },
        filename(req, file, callback) {
            const extension = path.extname(file.originalname).toLowerCase().replace('.jpeg', '.jpg');
            callback(null, `${randomUUID()}${extension}`);
        }
    }),
    limits: { files: MAX_FILES, fileSize: MAX_FILE_SIZE, fields: 3, fieldSize: 40000, parts: 8 },
    fileFilter(req, file, callback) {
        const expected = formats[path.extname(file.originalname).toLowerCase()];
        callback(expected && expected === file.mimetype ? null : new HttpError(415, 'Chi chap nhan JPG, PNG, WEBP va PDF.'), Boolean(expected && expected === file.mimetype));
    }
}).array('media', MAX_FILES);

function validSignature(buffer, mime) {
    if (mime === 'image/jpeg') return buffer.length > 4 && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255])) && buffer.subarray(-2).equals(Buffer.from([255, 217]));
    if (mime === 'image/png') return buffer.length >= 33 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && buffer.toString('ascii', 12, 16) === 'IHDR' && buffer.subarray(-8, -4).toString('ascii') === 'IEND';
    if (mime === 'image/webp') return buffer.length >= 20 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' && buffer.readUInt32LE(4) === buffer.length - 8 && ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.toString('ascii', 12, 16));
    if (mime === 'application/pdf') return /^%PDF-1\.[0-7]|^%PDF-2\.0/.test(buffer.toString('ascii', 0, 8)) && /%%EOF\s*$/.test(buffer.subarray(-1024).toString('ascii'));
    return false;
}

async function validateFiles(files) {
    const media = [];
    for (const file of files) {
        const buffer = await fs.readFile(file.path);
        if (!validSignature(buffer, file.mimetype)) throw new HttpError(415, 'Noi dung file khong dung dinh dang.');
        media.push({ media_url: `posts/${file.filename}`, media_type: file.mimetype === 'application/pdf' ? 'FILE' : 'IMAGE', display_order: media.length });
    }
    return media;
}

function postUpload(req, res, next) {
    upload(req, res, async (error) => {
        if (!error) return next();
        try {
            await removeFiles((req.files || []).map((file) => `posts/${file.filename}`));
        } catch (cleanupError) {
            console.error('Upload cleanup failed:', cleanupError.code || 'IO_ERROR');
        }
        next(error);
    });
}

module.exports = { postUpload, validateFiles, validSignature, MAX_FILES, MAX_FILE_SIZE };
