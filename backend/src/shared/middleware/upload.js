const multer = require('multer');

const fileRules = {
  'image/jpeg': 5 * 1024 * 1024,
  'image/png': 5 * 1024 * 1024,
  'image/webp': 5 * 1024 * 1024,
  'image/gif': 5 * 1024 * 1024,
  'application/pdf': 20 * 1024 * 1024,
  'text/csv': 10 * 1024 * 1024,
  'application/vnd.ms-excel': 10 * 1024 * 1024,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 10 * 1024 * 1024,
  'application/msword': 20 * 1024 * 1024,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 20 * 1024 * 1024,
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const maxSize = fileRules[file.mimetype];
    if (!maxSize) {
      const error = new Error('Unsupported file type.');
      error.statusCode = 400;
      callback(error);
      return;
    }

    callback(null, true);
  },
});

module.exports = upload;
