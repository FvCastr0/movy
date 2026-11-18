import { IsNotEmpty, IsString } from 'class-validator';

export class SaveMetaConfigDto {
  @IsString({ message: 'O ID da conta de anúncios deve ser uma string.' })
  @IsNotEmpty({ message: 'O ID da conta de anúncios Meta Ads não pode estar vazio.' })
  metaAdAccountId: string;

  @IsString({ message: 'O token de acesso deve ser uma string.' })
  @IsNotEmpty({ message: 'O token de acesso (access_token) da Meta Ads não pode estar vazio.' })
  accessToken: string;
}
