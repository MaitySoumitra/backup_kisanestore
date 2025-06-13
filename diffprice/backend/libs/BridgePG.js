const crypto = require('crypto');

class BridgePG {
    constructor() {
        // Constants matching the compiled implementations
        this.CHECKSUM_STR = 'checksum=';
        this.DEFAULT_IV = '0000000000000000'; // 16 zero bytes
        
        // Initialize with config if available, otherwise set to null
        try {
            // Uncomment these lines if you have a bridge_config.js file
            this.vk = Buffer.from(process.env.PRIVATE_KEY, 'base64').toString('utf8');
            this.uk = Buffer.from(process.env.PUBLIC_KEY, 'base64').toString('utf8');
            
            // this.vk = null; // Private key
            // this.uk = null; // Public key
        } catch (error) {
            this.vk = null;
            this.uk = null;
        }
    }

    // Method to set keys (supports both snake_case and camelCase)
    setKeyValues(privateKey, publicKey) {
        this.vk = privateKey;
        this.uk = publicKey;
    }

    set_key_values(privateKey, publicKey) {
        return this.setKeyValues(privateKey, publicKey);
    }

    // Public getter methods
    getPublicKey() {
        return this.uk;
    }

    getPrivateKey() {
        return this.vk;
    }

    // Remove PKCS7 padding - matching the compiled implementations
    removePadding(data) {
        if (!Buffer.isBuffer(data)) {
            data = Buffer.from(data);
        }
        
        if (data.length === 0) return data;
        
        const lastByte = data[data.length - 1];
        if (lastByte > 0 && lastByte <= 16) {
            // Verify padding is valid
            const paddingLength = lastByte;
            if (paddingLength <= data.length) {
                // Check if all padding bytes are the same
                for (let i = data.length - paddingLength; i < data.length; i++) {
                    if (data[i] !== paddingLength) {
                        return data; // Invalid padding, return original
                    }
                }
                return data.slice(0, data.length - paddingLength);
            }
        }
        return data;
    }

    // Add PKCS7 padding - matching the compiled implementations
    addPadding(data, blockSize = 16) {
        if (!Buffer.isBuffer(data)) {
            data = Buffer.from(data);
        }
        const paddingLength = blockSize - (data.length % blockSize);
        const padding = Buffer.alloc(paddingLength, paddingLength);
        return Buffer.concat([data, padding]);
    }

    // RSA sign data - matching HashAndSignBytes from .NET implementation
    rsaSignData(data = 'T!') {
        try {
            const sign = crypto.createSign('RSA-SHA256');
            sign.update(data, 'utf8');
            const signature = sign.sign(this.vk, 'base64');
            return signature;
        } catch (error) {
            return false;
        }
    }

    // Legacy method name
    generateSignature(data = 'T!') {
        return this.rsaSignData(data);
    }

    // RSA verify signature - matching the compiled implementations
    rsaVerifySignature(data, signature) {
        try {
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(data, 'utf8');
            
            // Handle both base64 string and Buffer inputs
            let signatureBuffer;
            if (Buffer.isBuffer(signature)) {
                signatureBuffer = signature;
            } else {
                signatureBuffer = Buffer.from(signature, 'base64');
            }
            
            return verify.verify(this.uk, signatureBuffer);
        } catch (error) {
            return false;
        }
    }

    // Legacy method name
    verifySignature(data, signature) {
        return this.rsaVerifySignature(data, signature);
    }

    // RSA encrypt - matching the compiled implementations with OAEP padding
    rsaEncrypt(data = 'T!') {
        try {
            const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
            const encrypted = crypto.publicEncrypt({
                key: this.uk,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
            }, buffer);
            return encrypted.toString('base64');
        } catch (error) {
            return false;
        }
    }

    // RSA decrypt - matching the compiled implementations
    rsaDecrypt(encryptedData) {
        try {
            const buffer = Buffer.from(encryptedData, 'base64');
            const decrypted = crypto.privateDecrypt({
                key: this.vk,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
            }, buffer);
            return decrypted.toString('base64');
        } catch (error) {
            return false;
        }
    }

    // AES encrypt -
    aesEncrypt(data = 'T!', key = null) {
        try {
            const keyToUse = key || this.DEFAULT_AES_KEY;
            const iv = Buffer.from(this.DEFAULT_IV, 'utf8');
            const keyBuffer = Buffer.from(keyToUse, 'utf8');
            
            // Ensure key is 32 bytes for AES-256
            const finalKey = Buffer.alloc(32);
            keyBuffer.copy(finalKey, 0, 0, Math.min(keyBuffer.length, 32));
            
            const paddedData = this.addPadding(data, 16);

            const cipher = crypto.createCipheriv('aes-256-cbc', finalKey, iv);
            cipher.setAutoPadding(false); // We handle padding manually
            
            let encrypted = cipher.update(paddedData);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            return encrypted.toString('base64');
        } catch (error) {
            return false;
        }
    }

    // AES decrypt
    aesDecrypt(encryptedData, key = null) {
        try {
            const keyToUse = key || this.DEFAULT_AES_KEY;
            const iv = Buffer.from(this.DEFAULT_IV, 'utf8');
            const keyBuffer = Buffer.from(keyToUse, 'utf8');
            
            // Ensure key is 32 bytes for AES-256
            const finalKey = Buffer.alloc(32);
            keyBuffer.copy(finalKey, 0, 0, Math.min(keyBuffer.length, 32));
            
            const buffer = Buffer.from(encryptedData, 'base64');

            const decipher = crypto.createDecipheriv('aes-256-cbc', finalKey, iv);
            decipher.setAutoPadding(false); // We handle padding manually
            
            let decrypted = decipher.update(buffer);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            const unpaddedData = this.removePadding(decrypted);
            return unpaddedData.toString('base64');
        } catch (error) {
            return false;
        }
    }

    // Combine encrypted data
    concatStrings(aesData, rsaData) {
        try {
            const rsaBuffer = Buffer.from(rsaData, 'base64');
            const aesBuffer = Buffer.from(aesData, 'base64');
            const combined = Buffer.concat([rsaBuffer, aesBuffer]);
            return combined.toString('base64');
        } catch (error) {
            return false;
        }
    }

    // Extract RSA part (first 128 bytes) - matching extractKey from .NET
    extractKey(combinedData) {
        try {
            const buffer = Buffer.from(combinedData, 'base64');
            if (buffer.length < 128) {
                return null;
            }
            const rsaPart = buffer.slice(0, 128);
            return rsaPart.toString('base64');
        } catch (error) {
            return null;
        }
    }

    // Extract AES part (after first 128 bytes) - matching extractPayload from .NET
    extractPayload(combinedData) {
        try {
            const buffer = Buffer.from(combinedData, 'base64');
            if (buffer.length <= 128) {
                return null;
            }
            const aesPart = buffer.slice(128);
            return aesPart.toString('base64');
        } catch (error) {
            return null;
        }
    }

    // Generate random AES key - 32 characters for AES-256
    getRandomAesKeyB64() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const randomBytes = crypto.randomBytes(32);
        
        for (let i = 0; i < 32; i++) {
            result += chars[randomBytes[i] % chars.length];
        }
        return result;
    }

    // Main encryption method
    encryptMessageForWallet(message, urlEncode = true) {
        try {
            // Step 1: Sign the message
            const signature = this.rsaSignData(message);
            if (!signature) {
                return false;
            }

            let encodedSignature = signature;
            if (urlEncode) {
                encodedSignature = encodeURIComponent(signature);
            }

            // Step 2: Prepare message with checksum
            const messageWithChecksum = message + this.CHECKSUM_STR + encodedSignature;
            
            // Step 3: Generate random AES key
            const aesKey = this.getRandomAesKeyB64();
            
            // Step 4: Encrypt message with AES
            const aesEncrypted = this.aesEncrypt(messageWithChecksum, aesKey);
            if (!aesEncrypted) {
                return false;
            }
            
            // Step 5: Encrypt AES key with RSA
            const rsaEncrypted = this.rsaEncrypt(aesKey);
            if (!rsaEncrypted) {
                return false;
            }
            
            // Step 6: Combine both encrypted parts
            let result = this.concatStrings(aesEncrypted, rsaEncrypted);
            if (!result) {
                return false;
            }
            
            if (urlEncode) {
                result = encodeURIComponent(result);
            }
            
            return result;
        } catch (error) {
            return false;
        }
    }

    // Legacy method name
    encrypt_message_for_wallet(message, urlEncode = true) {
        return this.encryptMessageForWallet(message, urlEncode);
    }

    // Main decryption method
    decryptWalletMessage(encryptedMessage, urlDecode = true, verifyChecksum = true) {
        try {
            let data = encryptedMessage;
            
            if (urlDecode) {
                data = decodeURIComponent(decodeURIComponent(data));
            }
            
            // Step 1: Extract RSA and AES parts
            const rsaPart = this.extractKey(data);
            const aesPart = this.extractPayload(data);
            
            if (!rsaPart || !aesPart) {
                return { message: null, isValid: false };
            }
            
            // Step 2: Decrypt AES key with RSA
            const aesKeyBase64 = this.rsaDecrypt(rsaPart);
            if (!aesKeyBase64) {
                return { message: null, isValid: false };
            }
            
            const aesKey = Buffer.from(aesKeyBase64, 'base64').toString('utf8');
            
            // Step 3: Decrypt message with AES
            const decryptedMessageBase64 = this.aesDecrypt(aesPart, aesKey);
            if (!decryptedMessageBase64) {
                return { message: null, isValid: false };
            }
            
            const messageString = Buffer.from(decryptedMessageBase64, 'base64').toString('utf8');
            
            // Step 4: Extract message and signature
            const checksumIndex = messageString.indexOf(this.CHECKSUM_STR);
            
            if (checksumIndex === -1) {
                return { message: messageString, isValid: false };
            }
            
            const originalMessage = messageString.substring(0, checksumIndex);
            
            let isValid = false;
            if (verifyChecksum) {
                let signature = messageString.substring(checksumIndex + this.CHECKSUM_STR.length);
                
                if (urlDecode) {
                    signature = decodeURIComponent(decodeURIComponent(signature));
                }
                
                isValid = this.rsaVerifySignature(originalMessage, Buffer.from(signature, 'base64'));
            }
            
            return {
                message: originalMessage,
                isValid: isValid
            };
        } catch (error) {
            return { message: null, isValid: false };
        }
    }

    // Legacy method name
    decrypt_wallet_message(encryptedMessage, urlDecode = true, verifyChecksum = true) {
        return this.decryptWalletMessage(encryptedMessage, urlDecode, verifyChecksum);
    }

    // Ping method - matching both implementations
    ping() {
        return 'PONG!!';
    }
}

module.exports = BridgePG;