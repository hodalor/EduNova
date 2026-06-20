const express = require('express');

const upload = require('../../shared/middleware/upload');
const { deleteSingle, uploadSingle } = require('./media.controller');

const router = express.Router();

router.post('/upload', upload.single('file'), uploadSingle);
router.delete('/upload', deleteSingle);

module.exports = router;
