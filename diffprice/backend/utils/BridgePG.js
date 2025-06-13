const crypto = require('crypto');

class BridgePG {
  constructor(privateKeyBase64, publicKeyBase64) {
    this.privateKey = Buffer.from(privateKeyBase64, 'base64').toString();
    this.publicKey = Buffer.from(publicKeyBase64, 'base64').toString();
  }

  pad(str, blockSize = 16) {
    const padLength = blockSize - (Buffer.byteLength(str) % blockSize);
    return str + String.fromCharCode(padLength).repeat(padLength);
  }

  unpad(str) {
    const pad = str.charCodeAt(str.length - 1);
    return str.slice(0, -pad);
  }

  sign(data) {
    const sign = crypto.createSign('sha256');
    sign.update(data);
    sign.end();
    return sign.sign(this.privateKey).toString('base64');
  }

  verify(data, signatureBase64) {
    const verify = crypto.createVerify('sha256');
    verify.update(data);
    verify.end();
    return verify.verify(this.publicKey, Buffer.from(signatureBase64, 'base64'));
  }

  rsaEncrypt(data) {
    return crypto.publicEncrypt({
      key: this.publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    }, Buffer.from(data)).toString('base64');
  }

  rsaDecrypt(encryptedBase64) {
    return crypto.privateDecrypt({
      key: this.privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    }, Buffer.from(encryptedBase64, 'base64')).toString();
  }

  aesEncrypt(data, key) {
    const iv = Buffer.alloc(16, 0);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    cipher.setAutoPadding(false);
    const padded = this.pad(data);
    return Buffer.concat([cipher.update(padded), cipher.final()]).toString('base64');
  }

  aesDecrypt(encryptedBase64, key) {
    const iv = Buffer.alloc(16, 0);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    decipher.setAutoPadding(false);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedBase64, 'base64')),
      decipher.final()
    ]).toString();
    return this.unpad(decrypted);
  }

  randomKey(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  encryptMessageForWallet(message, encodeURIComponentOutput = true) {
    const aesKey = this.randomKey();
    const checksum = this.sign(message);
    const signedMessage = message + 'checksum=' + (encodeURIComponentOutput ? encodeURIComponent(checksum) : checksum);
    const aesEncrypted = this.aesEncrypt(signedMessage, aesKey);
    const rsaEncryptedKey = this.rsaEncrypt(aesKey);
    const combined = Buffer.concat([
      Buffer.from(rsaEncryptedKey, 'base64'),
      Buffer.from(aesEncrypted, 'base64')
    ]);
    return encodeURIComponentOutput ? encodeURIComponent(combined.toString('base64')) : combined.toString('base64');
  }

  decryptWalletMessage(encrypted, decodeURIComponentInput = true, verify = true) {
    const decoded = decodeURIComponentInput ? decodeURIComponent(decodeURIComponent(encrypted)) : encrypted;
    const combined = Buffer.from(decoded, 'base64');
    const rsaPart = combined.slice(0, 128); // Assuming 1024-bit RSA
    const aesPart = combined.slice(128);

    const aesKey = this.rsaDecrypt(rsaPart.toString('base64'));
    const decrypted = this.aesDecrypt(aesPart.toString('base64'), aesKey);

    const [message, checksumPart] = decrypted.split('checksum=');
    const checksum = decodeURIComponentInput ? decodeURIComponent(decodeURIComponent(checksumPart)) : checksumPart;

    if (verify && !this.verify(message, checksum)) {
      throw new Error('Checksum verification failed');
    }

    return message;
  }

  ping() {
    return 'PONG!!';
  }
}

module.exports = BridgePG;
