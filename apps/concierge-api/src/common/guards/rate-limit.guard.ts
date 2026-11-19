import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../redis/redis.service';

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
  keyPrefix?: string;
}

export const RATE_LIMIT_KEY = 'concierge_rate_limit_options';
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || {
        limit: 120,
        windowSeconds: 60,
        keyPrefix: 'global_api',
      };

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const forwarded = req.headers?.['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
      req.ip ||
      'unknown_ip';

    // Para rotas de login, combina IP + email normalizado para impedir ataque distribuído a uma conta
    const emailIdentifier =
      options.keyPrefix === 'auth_login' && typeof req.body?.email === 'string'
        ? `:${req.body.email.trim().toLowerCase()}`
        : '';

    const key = `rl:${options.keyPrefix || 'api'}:${ip}${emailIdentifier}`;
    const { count, ttlSeconds } = await this.redisService.incrementRateLimit(
      key,
      options.windowSeconds,
    );

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', String(options.limit));
      res.setHeader(
        'X-RateLimit-Remaining',
        String(Math.max(0, options.limit - count)),
      );
      res.setHeader('X-RateLimit-Reset', String(ttlSeconds));
    }

    if (count > options.limit) {
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', String(ttlSeconds));
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Muitas requisições. Tente novamente em ${ttlSeconds} segundos.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
