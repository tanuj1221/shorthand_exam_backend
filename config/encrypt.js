const crypto = require('crypto');
require('dotenv').config();

// Replace with your own secure key (32 characters for AES-256)
const key = crypto.createHash('sha256').update(process.env.SECRET_KEY).digest();

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
    return `${iv.toString('hex')}:${encrypted}`;
}

// Function to decrypt encrypted text to a JSON object using AES-256-CBC
function decrypt(encryptedText) {
    if (typeof encryptedText !== 'string') {
        throw new TypeError('encryptedText must be a string');
    }

    // Split the input string into IV and encrypted data
    const [ivHex, encrypted] = encryptedText.split(':');
    
    if (!ivHex || !encrypted) {
        throw new Error('Invalid input format for decryption');
    }

    // Convert hex strings to buffers
    const iv = Buffer.from(ivHex, 'hex');

    // Create a decipher using the key and IV
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
        // Try to parse the decrypted text as JSON
        return JSON.parse(decrypted);
    } catch {
        // If parsing fails, return the decrypted text as is
        return decrypted;
    }
}


module.exports = { encrypt, decrypt };