const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { authenticate, authorize } = require('../middlewares/auth');
const podcastController = require('../controllers/podcastController');

const router = express.Router();

const uploadsRoot = path.join(process.cwd(), 'uploads');
const thumbnailsDir = path.join(uploadsRoot, 'podcast_thumbnails');
[uploadsRoot, thumbnailsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, thumbnailsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `podcast_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    }
});

function imageFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files allowed'), false);
    cb(null, true);
}

const uploadThumb = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Public
router.get('/', podcastController.list);

// Admin/Superadmin
router.get('/admin', authenticate, authorize('admin', 'superadmin'), podcastController.adminList);
router.post('/', authenticate, authorize('admin', 'superadmin'), uploadThumb.single('thumbnail'), podcastController.create);
router.put('/:id', authenticate, authorize('admin', 'superadmin'), uploadThumb.single('thumbnail'), podcastController.update);
router.patch('/:id/status', authenticate, authorize('admin', 'superadmin'), podcastController.setStatus);
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), podcastController.remove);

module.exports = router;


