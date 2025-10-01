const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { authenticate, authorize } = require('../middlewares/auth');
const musicController = require('../controllers/musicController');

const router = express.Router();

// Ensure upload folders exist
const uploadsRoot = path.join(process.cwd(), 'uploads');
const thumbnailsDir = path.join(uploadsRoot, 'thumbnails');
const audiosDir = path.join(uploadsRoot, 'audios');
[uploadsRoot, thumbnailsDir, audiosDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer storage configurations
const thumbnailStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, thumbnailsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `thumb_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    }
});

const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, audiosDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `audio_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    }
});

function thumbnailFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files allowed'), false);
    cb(null, true);
}

function audioFilter(req, file, cb) {
    if (!['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave'].includes(file.mimetype)) {
        return cb(new Error('Only audio files (mp3/wav) allowed'), false);
    }
    cb(null, true);
}

const uploadThumbnail = multer({ storage: thumbnailStorage, fileFilter: thumbnailFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadAudio = multer({ storage: audioStorage, fileFilter: audioFilter, limits: { fileSize: 50 * 1024 * 1024 } });

// Category routes
router.post('/categories', authenticate, authorize('admin', 'superadmin'), uploadThumbnail.single('thumbnail'), musicController.createCategory);
router.put('/categories/:id', authenticate, authorize('admin', 'superadmin'), uploadThumbnail.single('thumbnail'), musicController.updateCategory);
router.delete('/categories/:id', authenticate, authorize('admin', 'superadmin'), musicController.deleteCategory);
router.get('/categories', musicController.getAllCategories);
router.get('/categories/:categoryId/music', musicController.getMusicByCategory);

// Music routes
router.post('/categories/:categoryId/music', authenticate, authorize('admin', 'superadmin'), uploadAudio.single('audio'), musicController.addMusic);
router.post('/categories/:categoryId/music/bulk', authenticate, authorize('admin', 'superadmin'), uploadAudio.array('audios', 50), musicController.addMusicBulk);
router.put('/music/:id', authenticate, authorize('admin', 'superadmin'), uploadAudio.single('audio'), musicController.updateMusic);
router.delete('/music/:id', authenticate, authorize('admin', 'superadmin'), musicController.deleteMusic);
router.patch('/music/:id/status', authenticate, authorize('admin', 'superadmin'), musicController.setMusicStatus);

module.exports = router;


