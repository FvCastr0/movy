import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { MetaWebhookService } from './meta-webhook.service';
import { MetaSignatureGuard } from '../guards/meta-signature.guard';

@Controller('webhooks/meta')
export class MetaWebhookController {
  constructor(private readonly webhookService: MetaWebhookService) {}

  @Get()
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const validChallenge = await this.webhookService.verifyWebhookChallenge(
      mode,
      verifyToken,
      challenge,
    );
    return res.status(HttpStatus.OK).send(validChallenge);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(MetaSignatureGuard)
  async handleWebhook(@Body() payload: unknown) {
    return this.webhookService.handleMetaWebhookPayload(payload);
  }
}
