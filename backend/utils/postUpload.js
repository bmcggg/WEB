const multer = require('multer');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const { postDirectory, removeFiles } = require('./postFiles');
const { HttpError } = require('./postValidation');

const MAX_FILES = 5;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB/file

// Các định dạng được hỗ trợ và MIME tương ứng
const formats = {
    // Images
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.webp': ['image/webp'],
    '.gif': ['image/gif'],

    // Videos
    '.mp4': ['video/mp4'],
    '.webm': ['video/webm'],
    '.mov': ['video/quicktime'],

    // Audio
    '.mp3': ['audio/mpeg', 'audio/mp3'],
    '.wav': ['audio/wav', 'audio/x-wav'],
    '.ogg': ['audio/ogg', 'application/ogg'],
    '.m4a': ['audio/mp4', 'audio/x-m4a'],

    // Documents
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '.xls': ['application/vnd.ms-excel'],
    '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    '.ppt': ['application/vnd.ms-powerpoint'],
    '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    '.txt': ['text/plain'],
    '.csv': ['text/csv', 'application/vnd.ms-excel', 'text/plain'],

    // Compressed files
    '.zip': ['application/zip', 'application/x-zip-compressed']
};

const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, callback) {
            fs.mkdir(postDirectory, { recursive: true })
                .then(() => callback(null, postDirectory))
                .catch(callback);
        },

        filename(req, file, callback) {
            const extension = path.extname(file.originalname).toLowerCase() === '.jpeg'
                ? '.jpg'
                : path.extname(file.originalname).toLowerCase();

            callback(null, `${randomUUID()}${extension}`);
        }
    }),

    limits: {
        files: MAX_FILES,
        fileSize: MAX_FILE_SIZE,
        fields: 3,
        fieldSize: 40000,
        parts: 8
    },

    fileFilter(req, file, callback) {
        const extension = path.extname(file.originalname).toLowerCase();
        const allowedMimes = formats[extension];

        if (!allowedMimes || !allowedMimes.includes(file.mimetype)) {
            return callback(
                new HttpError(415, 'Định dạng file không được hỗ trợ hoặc MIME type không hợp lệ.')
            );
        }

        callback(null, true);
    }
}).array('media', MAX_FILES);


// Kiểm tra chữ ký file (magic bytes)
function validSignature(buffer, mime) {
    if (!buffer || buffer.length < 4) return false;

    // JPEG
    if (mime === 'image/jpeg') {
        return buffer.length > 4 &&
            buffer.subarray(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF])) &&
            buffer.subarray(-2).equals(Buffer.from([0xFF, 0xD9]));
    }

    // PNG
    if (mime === 'image/png') {
        return buffer.length >= 33 &&
            buffer.subarray(0, 8).equals(
                Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
            ) &&
            buffer.toString('ascii', 12, 16) === 'IHDR';
    }

    // WEBP
    if (mime === 'image/webp') {
        return buffer.length >= 20 &&
            buffer.toString('ascii', 0, 4) === 'RIFF' &&
            buffer.toString('ascii', 8, 12) === 'WEBP';
    }

    // GIF
    if (mime === 'image/gif') {
        return ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6));
    }

    // PDF
    if (mime === 'application/pdf') {
        return /^%PDF-/.test(buffer.toString('ascii', 0, 8)) &&
            /%%EOF\s*$/.test(buffer.subarray(-1024).toString('ascii'));
    }

    // MP4, MOV, M4A
    if (
        mime === 'video/mp4' ||
        mime === 'video/quicktime' ||
        mime === 'audio/mp4' ||
        mime === 'audio/x-m4a'
    ) {
        return buffer.length >= 12 &&
            buffer.toString('ascii', 4, 8) === 'ftyp';
    }

    // WEBM
    if (mime === 'video/webm') {
        return buffer.subarray(0, 4).equals(
            Buffer.from([0x1A, 0x45, 0xDF, 0xA3])
        );
    }

    // MP3
    if (mime === 'audio/mpeg' || mime === 'audio/mp3') {
        return buffer.toString('ascii', 0, 3) === 'ID3' ||
            (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0);
    }

    // WAV
    if (mime === 'audio/wav' || mime === 'audio/x-wav') {
        return buffer.toString('ascii', 0, 4) === 'RIFF' &&
            buffer.toString('ascii', 8, 12) === 'WAVE';
    }

    // OGG
    if (mime === 'audio/ogg' || mime === 'application/ogg') {
        return buffer.toString('ascii', 0, 4) === 'OggS';
    }

    // ZIP, DOCX, XLSX, PPTX
    if (
        mime === 'application/zip' ||
        mime === 'application/x-zip-compressed' ||
        mime.includes('openxmlformats')
    ) {
        return buffer[0] === 0x50 &&
            buffer[1] === 0x4B &&
            [0x03, 0x05, 0x07].includes(buffer[2]) &&
            [0x04, 0x06, 0x08].includes(buffer[3]);
    }

    // DOC, XLS, PPT dạng cũ (OLE)
    if (
        mime === 'application/msword' ||
        mime === 'application/vnd.ms-excel' ||
        mime === 'application/vnd.ms-powerpoint'
    ) {
        return buffer.subarray(0, 8).equals(
            Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])
        );
    }

    // TXT và CSV: không chấp nhận nội dung nhị phân
    if (mime === 'text/plain' || mime === 'text/csv') {
        return !buffer.includes(0);
    }

    return false;
}


// Kiểm tra file sau khi Multer lưu vào ổ đĩa
async function validateFiles(files) {
    const media = [];

    for (const file of files) {
        const buffer = await fs.readFile(file.path);

        if (!validSignature(buffer, file.mimetype)) {
            throw new HttpError(
                415,
                `Nội dung file ${file.originalname} không đúng định dạng.`
            );
        }

        const extension = path.extname(file.originalname).toLowerCase();

        let mediaType = 'FILE';

        if (extension.match(/^\.(jpg|jpeg|png|webp|gif)$/)) {
            mediaType = 'IMAGE';
        } else if (extension.match(/^\.(mp4|webm|mov)$/)) {
            mediaType = 'VIDEO';
        } else if (extension.match(/^\.(mp3|wav|ogg|m4a)$/)) {
            mediaType = 'AUDIO';
        }

        media.push({
            media_url: `posts/${file.filename}`,
            media_type: mediaType,
            display_order: media.length
        });
    }

    return media;
}


// Middleware upload
function postUpload(req, res, next) {
    upload(req, res, async (error) => {
        if (!error) return next();

        try {
            await removeFiles(
                (req.files || []).map(file => `posts/${file.filename}`)
            );
        } catch (cleanupError) {
            console.error(
                'Upload cleanup failed:',
                cleanupError.code || 'IO_ERROR'
            );
        }

        next(error);
    });
}

module.exports = {
    postUpload,
    validateFiles,
    validSignature,
    MAX_FILES,
    MAX_FILE_SIZE
};