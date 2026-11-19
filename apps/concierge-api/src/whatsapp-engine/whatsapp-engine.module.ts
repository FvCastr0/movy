import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { EncryptionService } from '../common/crypto/encryption.service';
import { MetaSignatureGuard } from './guards/meta-signature.guard';
import { MetaCloudApiService } from './meta/meta-cloud-api.service';
import { EconomicalLlmService } from './llm/economical-llm.service';
import { MetricsRecorderService } from './metrics/metrics-recorder.service';
import { MetaWebhookService } from './webhooks/meta-webhook.service';
import { MetaWebhookController } from './webhooks/meta-webhook.controller';
import { ConversationsService } from './conversations/conversations.service';
import { ConversationsController } from './conversations/conversations.controller';

@Module({
  imports: [AuthModule, KnowledgeBaseModule],
  controllers: [MetaWebhookController, ConversationsController],
  providers: [
    EncryptionService,
    MetaSignatureGuard,
    MetaCloudApiService,
    EconomicalLlmService,
    MetricsRecorderService,
    MetaWebhookService,
    ConversationsService,
  ],
  exports: [
    MetaWebhookService,
    ConversationsService,
    MetricsRecorderService,
    EconomicalLlmService,
  ],
})
export class WhatsappEngineModule {}
