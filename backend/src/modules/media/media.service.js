const { createSignedUrl, getPublicUrl, removeObject, uploadBuffer } = require('../../shared/helpers/storage');
const { scanBuffer } = require('../../shared/services/virus-scan.service');

const sniffMimeType = (file) => {
  const bytes = file.buffer;
  if (!bytes || bytes.length < 4) {
    return file.mimetype;
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'image/jpeg';
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (String.fromCharCode(...bytes.slice(0, 4)) === '%PDF') {
    return 'application/pdf';
  }
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF') {
    return 'image/webp';
  }

  return file.mimetype;
};

const uploadMediaFile = async ({
  file,
  bucketName,
  folder,
  visibility = 'private',
}) => {
  const detectedMimeType = sniffMimeType(file);
  if (detectedMimeType !== file.mimetype) {
    throw Object.assign(new Error('File MIME type validation failed.'), {
      statusCode: 400,
    });
  }

  const scanResult = await scanBuffer(file.buffer);
  if (!scanResult.clean) {
    throw Object.assign(new Error('File failed virus scan.'), {
      statusCode: 400,
    });
  }

  const uploaded = await uploadBuffer({
    bucketName,
    buffer: file.buffer,
    fileName: file.originalname,
    folder,
    contentType: file.mimetype,
  });

  const url =
    visibility === 'public'
      ? getPublicUrl({ bucketName: uploaded.bucket, objectPath: uploaded.path })
      : await createSignedUrl({
          bucketName: uploaded.bucket,
          objectPath: uploaded.path,
        });

  return {
    ...uploaded,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    visibility,
    url,
  };
};

const deleteMediaFile = async ({ bucketName, objectPath }) => {
  await removeObject({ bucketName, objectPath });
};

const getSignedMediaUrl = async ({ bucketName, objectPath, expiresIn }) =>
  createSignedUrl({ bucketName, objectPath, expiresIn });

module.exports = {
  uploadMediaFile,
  deleteMediaFile,
  getSignedMediaUrl,
};
