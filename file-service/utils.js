const crypto = require('crypto');

const algorithm = 'aes-256-ctr';

const send = (statusCode, data, err = null) => {
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  };

  if (err) {
    if (err.name === 'TokenExpiredError') {
      const { message } = err;
      return {
        statusCode: 401,
        headers: responseHeaders,
        body: JSON.stringify({
          message,
        }),
      };
    }
  }

  return {
    statusCode: statusCode,
    headers: responseHeaders,
    body: JSON.stringify(data),
  };
};

const bytesToMegaBytes = (bytes) => bytes / (1024 * 1024);

const encrypt = (buffer, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, generateKey(key), iv);
  const result = Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
  return result;
};

const decrypt = (encrypted, key) => {
  const iv = encrypted.slice(0, 16);
  encrypted = encrypted.slice(16);
  const decipher = crypto.createDecipheriv(algorithm, generateKey(key), iv);
  const result = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return result;
};

const generateKey = (key) =>
  crypto
    .createHash('sha256')
    .update(String(key))
    .digest('base64')
    .substr(0, 32);

module.exports = {
  send,
  bytesToMegaBytes,
  encrypt,
  decrypt,
};
