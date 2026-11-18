import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Criptografa uma string usando AES-256-GCM.
 * Retorna uma string no formato "ivHex:authTagHex:encryptedHex".
 */
export function encryptToken(plainText: string, secretKeyHex?: string): string {
  const keyHex = secretKeyHex || process.env.META_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'META_ENCRYPTION_KEY deve ser uma chave hexadecimal de 32 bytes (64 caracteres).'
    );
  }

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
  const keyHex = secretKeyHex || process.env.META_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'META_ENCRYPTION_KEY deve ser uma chave hexadecimal de 32 bytes (64 caracteres).'
    );
  }

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
