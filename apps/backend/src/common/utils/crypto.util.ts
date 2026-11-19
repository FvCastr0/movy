import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const DEFAULT_FALLBACK_KEY = '87fda1b51f69ce6a8ce119f34f44eabc1db6e2c7dc5f41f12369622795be6574';

function resolveKey(secretKeyHex?: string): string {
  const candidate = secretKeyHex || process.env.META_ENCRYPTION_KEY;
  if (candidate && candidate.trim().length === 64) {
    return candidate.trim();
  }
  return DEFAULT_FALLBACK_KEY;
}

/**
 * Criptografa uma string usando AES-256-GCM.
 * Retorna uma string no formato "ivHex:authTagHex:encryptedHex".
 */
export function encryptToken(plainText: string, secretKeyHex?: string): string {
  const keyHex = resolveKey(secretKeyHex);

  const iv = randomBytes(12); // IV de 96 bits recomendado para GCM
  const key = Buffer.from(keyHex, 'hex');
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Descriptografa uma string criptografada pelo encryptToken.
 */
export function decryptToken(cipherString: string, secretKeyHex?: string): string {
  const keyHex = resolveKey(secretKeyHex);

  const parts = cipherString.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato inválido de token criptografado.');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = Buffer.from(keyHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
