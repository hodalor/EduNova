const { deleteMediaFile, uploadMediaFile } = require('./media.service');

const uploadSingle = async (req, res) => {
  if (!req.file) {
    const error = new Error('No file uploaded.');
    error.statusCode = 400;
    throw error;
  }

  const payload = await uploadMediaFile({
    file: req.file,
    bucketName: req.body.bucketName,
    folder: req.body.folder,
    visibility: req.body.visibility,
  });

  res.status(201).json({
    success: true,
    message: 'File uploaded successfully.',
    data: payload,
  });
};

const deleteSingle = async (req, res) => {
  const { bucketName, objectPath } = req.body;

  if (!objectPath) {
    const error = new Error('objectPath is required.');
    error.statusCode = 400;
    throw error;
  }

  await deleteMediaFile({ bucketName, objectPath });

  res.status(200).json({
    success: true,
    message: 'File deleted successfully.',
  });
};

module.exports = {
  uploadSingle,
  deleteSingle,
};
