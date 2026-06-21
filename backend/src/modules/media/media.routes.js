const express = require('express');

const upload = require('../../shared/middleware/upload');
const { deleteSingle, getSignedUrl, uploadSingle } = require('./media.controller');

const router = express.Router();

router.post('/upload', upload.single('file'), uploadSingle);
router.delete('/upload', deleteSingle);
router.get('/signed-url', getSignedUrl);

module.exports = router;
