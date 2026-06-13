const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Cloudflare R2 — S3-compatible object storage
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL; // масалан: https://pub-xxxx.r2.dev ё домени худ

// Файлро ба R2 мебарорад ва URL-и оммавиро бармегардонад
async function uploadToR2(buffer, originalName, folder, mimetype) {
  const key = `${folder}/${uuidv4()}${path.extname(originalName)}`;
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  }));
  return `${PUBLIC_URL}/${key}`;
}

// Файлро аз R2 нест мекунад (бар асоси URL)
async function deleteFromR2(url) {
  if (!url || !url.startsWith(PUBLIC_URL)) return;
  const key = url.slice(PUBLIC_URL.length + 1);
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (_) {}
}

module.exports = { r2, uploadToR2, deleteFromR2, BUCKET, PUBLIC_URL };
