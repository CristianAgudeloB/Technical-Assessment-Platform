import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ProgrammingLanguage } from '../../../question/domain/question';

export class RunCodeDto {
  @IsEnum(ProgrammingLanguage)
  language!: ProgrammingLanguage;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30_000)
  sourceCode!: string;

  @Transform(({ value }) => value ?? '')
  @IsString()
  @MaxLength(10_000)
  stdin = '';
}
