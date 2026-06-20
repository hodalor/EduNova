const crypto = require('crypto');
const PDFDocument = require('pdfkit');

const parsePagination = (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

const createSequence = (prefix, date = new Date(), counter = 1, width = 6) =>
  `${prefix}-${date.getFullYear()}-${String(counter).padStart(width, '0')}`;

const randomCode = (size = 6) =>
  crypto.randomInt(10 ** (size - 1), 10 ** size - 1).toString();

const randomPassword = (size = 10) =>
  crypto.randomBytes(size).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, size) ||
  'Eduova1234';

const buildPdfBuffer = (builder) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    builder(doc);
    doc.end();
  });

const successMeta = (count, page, limit) => ({ count, page, limit });

module.exports = {
  parsePagination,
  createSequence,
  randomCode,
  randomPassword,
  buildPdfBuffer,
  successMeta,
};
