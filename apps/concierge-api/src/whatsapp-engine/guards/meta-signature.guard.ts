import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * OWASP A02 / A08: Valida a assinatura HMAC-SHA256 oficial da Meta Cloud API
 * enviada no header `X-Hub-Signature-256` (formato: `sha256=<hex>`) usando
 * comparação em tempo constante (`crypto.timingSafeEqual`).
 */
@Injectable()
export class MetaSignatureGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const signatureHeader = req.headers?.['x-hub-signature-256'];
    const appSecret =
      process.env.META_APP_SECRET || 'movy_meta_app_secret_2026_default';

    const rawBody: Buffer | undefined =
      req.rawBody ||
      (req.body ? Buffer.from(JSON.stringify(req.body), 'utf8') : undefined);

    if (
      typeof signatureHeader !== 'string' ||
      !signatureHeader.startsWith('sha256=') ||
      !rawBody
    ) {
      throw new UnauthorizedException(
        'Assinatura X-Hub-Signature-256 ausente ou malformada',
      );
    }

    const expectedSignature =
      'sha256=' +
      crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

    const providedBuf = Buffer.from(signatureHeader, 'utf8');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');

    if (
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      throw new UnauthorizedException('Assinatura do webhook Meta inválida');
    }

    return true;
  }
}
