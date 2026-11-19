import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Valida se uma URL usa exclusivamente HTTPS e não aponta para loopback,
 * link-local (169.254.169.254) ou faixas privadas RFC1918 (Anti-SSRF - OWASP A03/A10).
 */
export function isSafePublicHttpsUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 2048) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '::1' ||
    host === '0.0.0.0'
  ) {
    return false;
  }

  // Bloqueia endereços IPv4 privados, loopback e metadata cloud
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (
      a === 127 ||
      a === 10 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31)
    ) {
      return false;
    }
  }

  if (!host.includes('.')) {
    return false;
  }

  return true;
}

export function IsSafePublicHttpsUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSafePublicHttpsUrl',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} deve ser uma URL pública HTTPS válida (ex: https://cardapio.seudelivery.com.br)`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          return isSafePublicHttpsUrl(value);
        },
      },
    });
  };
}

/**
 * Sanitiza campos de texto livre da Base de Conhecimento contra Prompt Injection (OWASP LLM01).
 * Remove tags de controle de sistema e instruções de override de prompt.
 */
export function sanitizePromptField(input: string | null | undefined): string {
  if (!input) {
    return '';
  }

  return input
    .replace(/<\/?(?:system|assistant|user|instruction|prompt)>/gi, '')
    .replace(/\[\/?INST\]/gi, '')
    .replace(/<<\/?SYS>>/gi, '')
    .replace(
      /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/gi,
      '[instrução removida]',
    )
    .replace(/desconsidere\s+(?:todas\s+as\s+)?instru[cç][oõ]es\s+anteriores/gi, '[instrução removida]')
    .trim();
}
