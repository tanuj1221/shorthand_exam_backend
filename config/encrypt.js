const crypto = require('crypto');
require('dotenv').config();

// Replace with your own secure key (32 characters for AES-256)
function deriveKey(secretKey) {
    return crypto.createHash('sha256').update(secretKey).digest().slice(0, 32);
}

const key = deriveKey(process.env.SECRET_KEY);

// Function to encrypt a JSON object using AES-256-CBC
function encrypt(obj) {
    // Convert the object to a JSON string
    const plainText = JSON.stringify(obj);
    
    // Generate a random IV
    const iv = crypto.randomBytes(16);

    // Create a cipher using the key and IV
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    // Encrypt the plaintext
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV and encrypted data separated by a colon
    return `${iv.toString('base64')}:${Buffer.from(encrypted, 'hex').toString('base64')}`;
}

// Function to decrypt encrypted text to a JSON object using AES-256-CBC
function decrypt(encryptedText) {
    console.log('Attempting to decrypt:', encryptedText);
    if (typeof encryptedText !== 'string') {
        throw new TypeError('encryptedText must be a string');
    }

    // Split the input string into IV and encrypted data
    const [ivBase64, encryptedBase64] = encryptedText.split(':');
    
    if (!ivBase64 || !encryptedBase64) {
        throw new Error('Invalid input format for decryption');
    }

    console.log('IV (base64):', ivBase64);
    console.log('Encrypted data (base64):', encryptedBase64);

    // Convert Base64 strings to buffers
    const iv = Buffer.from(ivBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');

    console.log('IV (buffer):', iv.toString('hex'));
    console.log('Encrypted data (buffer):', encrypted.toString('hex'));

    // Create a decipher using the key and IV
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    // Decrypt the data
    let decrypted;
    try {
        decrypted = decipher.update(encrypted, 'binary', 'utf8');
        decrypted += decipher.final('utf8');
        console.log('Successfully decrypted:', decrypted);
    } catch (error) {
        console.error('Error during decryption:', error);
        throw error;
    }

    try {
        // Try to parse the decrypted text as JSON
        return JSON.parse(decrypted);
    } catch (error) {
        console.log('Failed to parse as JSON, returning as is');
        // If parsing fails, return the decrypted text as is
        return decrypted;
    }
}


module.exports = { encrypt, decrypt };