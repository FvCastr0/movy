import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private readonly memoryFallback = new Map<
    string,
    { count: number; expiresAt: number }
  >();
  private readonly messageBuffers = new Map<string, string[]>();

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl && process.env.NODE_ENV !== 'test') {
      try {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          lazyConnect: true,
        });
        this.client.on('error', (err) => {
          this.logger.warn(
            `Redis connection error (using fallback): ${err.message}`,
          );
        });
      } catch {
        this.logger.warn(
          'Failed to initialize Redis client, using memory fallback',
        );
      }
    }
  }

  /**
   * Incrementa contador de Rate Limit em janela fixa (em segundos).
   * Usa Redis INCR + EXPIRE quando conectado, ou fallback atômico em memória.
   */
  async incrementRateLimit(
    key: string,
    windowSeconds: number,
  ): Promise<{ count: number; ttlSeconds: number }> {
    if (this.client && this.client.status === 'ready') {
      try {
        const count = await this.client.incr(key);
        if (count === 1) {
          await this.client.expire(key, windowSeconds);
        }
        const ttl = await this.client.ttl(key);
        return {
          count,
          ttlSeconds: ttl > 0 ? ttl : windowSeconds,
        };
      } catch {
        // Fallback em caso de queda momentânea do Redis
      }
    }

    const now = Date.now();
    const existing = this.memoryFallback.get(key);
    if (!existing || existing.expiresAt <= now) {
      const expiresAt = now + windowSeconds * 1000;
      this.memoryFallback.set(key, { count: 1, expiresAt });
      return { count: 1, ttlSeconds: windowSeconds };
    }

    existing.count += 1;
    const ttlSeconds = Math.max(
      1,
      Math.ceil((existing.expiresAt - now) / 1000),
    );
    return { count: existing.count, ttlSeconds };
  }

  /**
   * Agrupa mensagens picadas de um mesmo consumidor no buffer Redis (debounce)
   * para consolidar em uma única chamada ao LLM econômico.
   */
  async appendMessageToBuffer(
    tenantId: string,
    customerPhone: string,
    text: string,
    ttlSeconds = 30,
  ): Promise<number> {
    const key = `msg_buf:${tenantId}:${customerPhone}`;
    if (this.client && this.client.status === 'ready') {
      try {
        const len = await this.client.rpush(key, text);
        await this.client.expire(key, ttlSeconds);
        return len;
      } catch {
        // Fallback em memória
      }
    }

    const list = this.messageBuffers.get(key) || [];
    list.push(text);
    this.messageBuffers.set(key, list);
    return list.length;
  }

  /**
   * Consome e limpa atomicamente todas as mensagens acumuladas no buffer do contato.
   */
  async flushBufferedMessages(
    tenantId: string,
    customerPhone: string,
  ): Promise<string[]> {
    const key = `msg_buf:${tenantId}:${customerPhone}`;
    if (this.client && this.client.status === 'ready') {
      try {
        const items = await this.client.lrange(key, 0, -1);
        await this.client.del(key);
        return items;
      } catch {
        // Fallback em memória
      }
    }

    const items = this.messageBuffers.get(key) || [];
    this.messageBuffers.delete(key);
    return items;
  }

  /**
   * OWASP A04 / LLM10: Rate-Limit por Contato de WhatsApp (protege contra flood de bots gastando tokens).
   * Padrão: máximo de 15 respostas de IA a cada 15 minutos (900s) para um mesmo número.
   */
  async checkContactAiRateLimit(
    tenantId: string,
    customerPhone: string,
    maxCalls = 15,
    windowSeconds = 900,
  ): Promise<{ allowed: boolean; count: number }> {
    const key = `ai_rl:${tenantId}:${customerPhone}`;
    const { count } = await this.incrementRateLimit(key, windowSeconds);
    return {
      allowed: count <= maxCalls,
      count,
    };
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }
}
