import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, EncryptionService, InternalApiKeyGuard],
  exports: [TenantsService, EncryptionService],
})
export class TenantsModule {}
