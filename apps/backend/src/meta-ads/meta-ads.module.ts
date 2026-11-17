import { Module } from '@nestjs/common';
import { MetaAdsService } from './meta-ads.service';

@Module({
  providers: [MetaAdsService],
  exports: [MetaAdsService],
})
export class MetaAdsModule {}
