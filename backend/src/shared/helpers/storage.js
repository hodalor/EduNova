const path = require('path');
const { randomUUID } = require('crypto');

const env = require('../../config/env');
const { getSupabaseAdmin, hasSupabaseConfig } = require('../../config/supabase');

const resolveBucket = (bucketName) =>
  bucketName || env.SUPABASE_STORAGE_BUCKET || env.SUPABASE_PUBLIC_BUCKET;

const buildObjectPath = ({ folder = 'uploads', fileName }) => {
  const extension = path.extname(fileName || '');
  return `${folder}/${randomUUID()}${extension}`;
};

const uploadBuffer = async ({
  bucketName,
  buffer,
  fileName,
  folder,
  contentType,
  upsert = false,
}) => {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase storage is not configured.');
  }

  const bucket = resolveBucket(bucketName);
  if (!bucket) {
    throw new Error(
      'No Supabase storage bucket configured. Set SUPABASE_STORAGE_BUCKET or pass bucketName.'
    );
  }

  const objectPath = buildObjectPath({ folder, fileName });
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType,
    upsert,
  });

  if (error) {
    throw error;
  }

  return {
    bucket,
    path: data.path,
    fullPath: data.fullPath,
  };
};

const createSignedUrl = async ({ bucketName, objectPath, expiresIn = 3600 }) => {
  const bucket = resolveBucket(bucketName);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, expiresIn);

  if (error) {
    throw error;
  }

  return data.signedUrl;
};

const getPublicUrl = ({ bucketName, objectPath }) => {
  const bucket = resolveBucket(bucketName);
  const supabase = getSupabaseAdmin();
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

  return data.publicUrl;
};

const removeObject = async ({ bucketName, objectPath }) => {
  const bucket = resolveBucket(bucketName);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(bucket).remove([objectPath]);

  if (error) {
    throw error;
  }
};

module.exports = {
  uploadBuffer,
  createSignedUrl,
  getPublicUrl,
  removeObject,
};
