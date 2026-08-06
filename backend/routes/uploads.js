const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.png').toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, req.user._id + '-' + uniqueSuffix + ext);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedExts = /\.(jpeg|jpg|png|webp|gif|jfif)$/i;
  const isImageMime = file.mimetype && (file.mimetype.startsWith('image/') || /jpeg|jpg|png|webp|gif/i.test(file.mimetype));
  const isAllowedExt = allowedExts.test(path.extname(file.originalname).toLowerCase());

  if (isImageMime || isAllowedExt) {
    return cb(null, true);
  }
  cb(new Error('Only images (jpeg, jpg, png, webp, gif) are allowed'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

// @route   POST /api/uploads/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', protect, (req, res) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File is too large (max 5MB)' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Construct the public URL
    const protocol = req.protocol;
    const host = req.get('host');
    // Important: if we are running the API on port 5000, host will be localhost:5000
    // so this will construct http://localhost:5000/uploads/avatars/filename.png
    const avatarUrl = `${protocol}://${host}/uploads/avatars/${req.file.filename}`;

    res.status(200).json({ success: true, url: avatarUrl });
  });
});

module.exports = router;
