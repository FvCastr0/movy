import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EncryptionService } from '../crypto/encryption.service';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly encryptionService: EncryptionService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers?.['x-concierge-internal-key'];
    const expectedKey =
      process.env.CONCIERGE_INTERNAL_API_KEY ||
      'movy_s2s_concierge_internal_secret_2026';

    if (
      typeof providedKey !== 'string' ||
      !this.encryptionService.timingSafeCompare(providedKey, expectedKey)
    ) {
      throw new UnauthorizedException(
        'Chave de comunicação S2S inválida ou ausente (X-Concierge-Internal-Key)',
      );
    }

    return true;
  }
}
