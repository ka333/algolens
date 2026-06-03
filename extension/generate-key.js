import crypto from 'crypto';
import fs from 'fs';

// Generate RSA key pair (1024-bit RSA is standard for Chrome extensions)
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 1024,
  publicKeyEncoding: {
    type: 'spki',
    format: 'der'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Convert the public key to a base64 string (this is the manifest key)
const manifestKey = publicKey.toString('base64');

// Calculate the Extension ID from the public key
// 1. Take SHA256 of the DER public key (Chrome uses the SHA-256 of the SPKI format)
const sha256 = crypto.createHash('sha256').update(publicKey).digest('hex');

// 2. Take the first 32 characters of the hex hash and map them to a-p (0->a, 1->b, ..., f->p)
const extensionId = sha256
  .slice(0, 32)
  .split('')
  .map(char => String.fromCharCode(parseInt(char, 16) + 97))
  .join('');

console.log('==================================================================');
console.log('AlgoLens Chrome Extension - Persistent Key Generator 🔑');
console.log('==================================================================\n');
console.log('1. Add the following "key" field at the root level of your manifest.json:');
console.log('------------------------------------------------------------------');
console.log(`"key": "${manifestKey}",`);
console.log('------------------------------------------------------------------\n');
console.log(`2. This will lock your Extension ID permanently to: ${extensionId}`);
console.log('This ensures local storage, GitHub tokens, and streaks are preserved across all');
console.log('compilations, folder moves, and developer reloads!\n');
console.log('3. Your private key has been saved to: private_key.pem');
console.log('Keep this file safe if you intend to sign self-hosted .crx bundles.');
console.log('------------------------------------------------------------------');

fs.writeFileSync('private_key.pem', privateKey);
