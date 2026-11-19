import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor() {
    const rawKey =
      process.env.CONCIERGE_ENCRYPTION_KEY ||
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      this.key = Buffer.from(rawKey, 'hex');
    } else {
      this.key = crypto.createHash('sha256').update(rawKey).digest();
    }
  }

  /**
   * Cifra dados sensíveis (ex: Meta Cloud API Access Token) com AES-256-GCM.
   * Formato de saída: ivHex:authTagHex:ciphertextHex
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decifra e autentica a integridade de um payload AES-256-GCM.
   */
  decrypt(payload: string): string {
    const parts = payload.split(':');
    if (parts.length !== 3) {
      throw new InternalServerErrorException('Invalid encrypted payload format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    if (iv.length !== 12 || authTag.length !== 16) {
      throw new InternalServerErrorException('Invalid cryptographic parameters');
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  /**
   * Comparação em tempo constante (Anti-Timing Attack) usando SHA-256 + timingSafeEqual.
   */
  timingSafeCompare(provided: string, expected: string): boolean {
    if (!provided || !expected) {
      return false;
    }
    const hashProvided = crypto.createHash('sha256').update(provided).digest();
    const hashExpected = crypto.createHash('sha256').update(expected).digest();

    const matchesHash = crypto.timingSafeEqual(hashProvided, hashExpected);
    return matchesHash && provided.length === expected.length;
  }
}
