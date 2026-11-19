import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'movy-concierge-api',
      timestamp: new Date().toISOString(),
    };
  }
}
