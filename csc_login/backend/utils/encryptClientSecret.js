const crypto = require('crypto');

exports.encryptClientSecret = function (in_t, token) {
  const iv = Buffer.from("0000000000000000", "utf8");
  const pre = ":", post = "@";
  const prefix = Math.floor(10 + Math.random() * 90);
  const suffix = Math.floor(10 + Math.random() * 90);
  const plaintext = `${prefix}${pre}${in_t}${post}${suffix}`;
  const blockSize = 16;
  const padLength = blockSize - (plaintext.length % blockSize);
  const padded = Buffer.concat([Buffer.from(plaintext, 'utf8'), Buffer.alloc(padLength, padLength)]);
  const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(token, 'utf8'), iv);
  let encrypted = cipher.update(padded);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString('hex');
};
