import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  RateLimit,
  RateLimitGuard,
} from '../common/guards/rate-limit.guard';
import { TenantJwtGuard } from '../common/guards/tenant-jwt.guard';
import {
  AuthenticatedTenantUser,
  CurrentTenantUser,
} from '../common/decorators/tenant-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    limit: 10,
    windowSeconds: 900, // 10 tentativas a cada 15 minutos por IP + Email (OWASP A04/A07)
    keyPrefix: 'auth_login',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(TenantJwtGuard)
  async getMe(@CurrentTenantUser() user: AuthenticatedTenantUser) {
    return this.authService.getMe(user);
  }
}
