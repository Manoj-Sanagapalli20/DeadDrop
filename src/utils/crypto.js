// Galois Field GF(2^8) Primitive Polynomial: x^8 + x^4 + x^3 + x^2 + 1 (0x11d)
const PRIMITIVE = 0x11d;

// Exponential and logarithm tables for GF(2^8)
const expTable = new Uint8Array(256);
const logTable = new Uint8Array(256);

// Initialize tables
let x = 1;
for (let i = 0; i < 255; i++) {
  expTable[i] = x;
  logTable[x] = i;
  x <<= 1;
  if (x & 0x100) {
    x ^= PRIMITIVE;
  }
}
expTable[255] = expTable[0];

// Addition in GF(2^8) is bitwise XOR
function gfAdd(a, b) {
  return a ^ b;
}

// Multiplication in GF(2^8) using log and exp tables
function gfMultiply(a, b) {
  if (a === 0 || b === 0) return 0;
  return expTable[(logTable[a] + logTable[b]) % 255];
}

// Division in GF(2^8) using log and exp tables
function gfDivide(a, b) {
  if (b === 0) throw new Error("Division by zero in GF(2^8)");
  if (a === 0) return 0;
  return expTable[(logTable[a] - logTable[b] + 255) % 255];
}

// Evaluate a polynomial at xVal
function evaluatePolynomial(poly, xVal) {
  let result = 0;
  let xPower = 1;
  for (let i = 0; i < poly.length; i++) {
    result = gfAdd(result, gfMultiply(poly[i], xPower));
    xPower = gfMultiply(xPower, xVal);
  }
  return result;
}

// Lagrange interpolation to reconstruct the secret (y-intercept at x = 0)
function interpolateAtZero(points) {
  let secret = 0;
  for (let i = 0; i < points.length; i++) {
    let li = 1;
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const num = points[j].x;
      const den = gfAdd(points[i].x, points[j].x);
      li = gfMultiply(li, gfDivide(num, den));
    }
    secret = gfAdd(secret, gfMultiply(points[i].y, li));
  }
  return secret;
}

/**
 * Splits a secret array of bytes into a given number of shares.
 * Any 'threshold' shares can reconstruct it.
 * 
 * @param {Uint8Array} secretBytes - The secret data to split
 * @param {number} threshold - Minimum number of shares to reconstruct (e.g., 2)
 * @param {number} numShares - Total number of shares to create (e.g., 3)
 * @returns {Array<{x: number, data: Uint8Array}>} Array of share objects
 */
export function splitSecret(secretBytes, threshold, numShares) {
  const shares = [];
  for (let i = 1; i <= numShares; i++) {
    shares.push({ x: i, data: new Uint8Array(secretBytes.length) });
  }

  for (let byteIdx = 0; byteIdx < secretBytes.length; byteIdx++) {
    const secretByte = secretBytes[byteIdx];
    
    // Create random polynomial coefficients
    const poly = new Uint8Array(threshold);
    poly[0] = secretByte;
    for (let t = 1; t < threshold; t++) {
      poly[t] = Math.floor(Math.random() * 256);
    }

    // Evaluate for each share at x = 1, 2, 3...
    for (let shareIdx = 0; shareIdx < numShares; shareIdx++) {
      const xVal = shares[shareIdx].x;
      shares[shareIdx].data[byteIdx] = evaluatePolynomial(poly, xVal);
    }
  }

  return shares;
}

/**
 * Reconstructs a secret array of bytes from a subset of shares.
 * 
 * @param {Array<{x: number, data: Uint8Array}>} shares - The subset of shares
 * @returns {Uint8Array} The reconstructed original secret
 */
export function reconstructSecret(shares) {
  if (shares.length === 0) return new Uint8Array(0);
  const len = shares[0].data.length;
  const secret = new Uint8Array(len);

  for (let byteIdx = 0; byteIdx < len; byteIdx++) {
    const points = shares.map(s => ({ x: s.x, y: s.data[byteIdx] }));
    secret[byteIdx] = interpolateAtZero(points);
  }

  return secret;
}

/**
 * Encrypts file bytes using AES-GCM 256-bit with a key.
 * 
 * @param {Uint8Array} fileBytes - Raw file contents
 * @param {Uint8Array} keyBytes - 32-byte key
 * @returns {Promise<{encryptedBytes: Uint8Array, iv: Uint8Array}>} Encrypted data and IV
 */
export async function encryptFile(fileBytes, keyBytes) {
  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    "AES-GCM",
    true,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    fileBytes
  );

  return {
    encryptedBytes: new Uint8Array(encryptedBuffer),
    iv
  };
}

/**
 * Decrypts encrypted file bytes using AES-GCM 256-bit.
 * 
 * @param {Uint8Array} encryptedBytes - Encrypted file contents
 * @param {Uint8Array} keyBytes - 32-byte key
 * @param {Uint8Array} iv - The 12-byte initialization vector
 * @returns {Promise<Uint8Array>} Decrypted raw file bytes
 */
export async function decryptFile(encryptedBytes, keyBytes, iv) {
  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    "AES-GCM",
    true,
    ["decrypt"]
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encryptedBytes
  );

  return new Uint8Array(decryptedBuffer);
}

/**
 * Generates an RSA-OAEP 2048-bit keypair for asymmetric encryption.
 * 
 * @returns {Promise<CryptoKeyPair>} Generated RSA keypair
 */
export async function generateRSAKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts data using an RSA public key.
 * 
 * @param {CryptoKey} publicKey - The recipient's public key
 * @param {Uint8Array} dataBytes - The raw bytes to encrypt
 * @returns {Promise<Uint8Array>} The RSA encrypted ciphertext
 */
export async function rsaEncrypt(publicKey, dataBytes) {
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    dataBytes
  );
  return new Uint8Array(encryptedBuffer);
}

/**
 * Decrypts data using an RSA private key.
 * 
 * @param {CryptoKey} privateKey - The recipient's private key
 * @param {Uint8Array} encryptedBytes - The RSA encrypted bytes
 * @returns {Promise<Uint8Array>} The decrypted raw bytes
 */
export async function rsaDecrypt(privateKey, encryptedBytes) {
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedBytes
  );
  return new Uint8Array(decryptedBuffer);
}

/**
 * Exports a cryptographic key into JSON Web Key (JWK) format for storage/sharing.
 * 
 * @param {CryptoKey} key - Cryptographic key
 * @returns {Promise<Object>} Exported JWK object
 */
export async function exportKeyJWK(key) {
  return await window.crypto.subtle.exportKey("jwk", key);
}

/**
 * Imports a key from JSON Web Key (JWK) format.
 * 
 * @param {Object} jwk - The JWK object
 * @param {Object} algorithm - Key properties (e.g. name: "RSA-OAEP", hash: "SHA-256")
 * @param {Array<string>} usages - Key usages (e.g. ["encrypt"] or ["decrypt"])
 * @returns {Promise<CryptoKey>} The imported CryptoKey
 */
export async function importKeyJWK(jwk, algorithm, usages) {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    algorithm,
    true,
    usages
  );
}

/**
 * Helper to generate a new cryptographically secure 256-bit (32-byte) key.
 * 
 * @returns {Uint8Array} 32-byte raw key
 */
export function generateAESKeyBytes() {
  return window.crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Helper to convert Uint8Array bytes to a Hexadecimal string.
 */
export function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Helper to convert a Hexadecimal string back to a Uint8Array.
 */
export function hexToBytes(hexString) {
  const result = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    result[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return result;
}
