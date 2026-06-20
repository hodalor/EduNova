const { createSignedUrl, getPublicUrl, removeObject, uploadBuffer } = require('../../shared/helpers/storage');

const uploadMediaFile = async ({
  file,
  bucketName,
  folder,
  visibility = 'private',
}) => {
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

module.exports = {
  uploadMediaFile,
  deleteMediaFile,
};
