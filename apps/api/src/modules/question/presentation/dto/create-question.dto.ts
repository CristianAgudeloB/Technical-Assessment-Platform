import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProgrammingLanguage } from '../../domain/question';

export class CreateTestCaseDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position!: number;

  @IsString()
  @MaxLength(10_000)
  input!: string;

  @IsString()
  @MaxLength(10_000)
  expectedOutput!: string;

  @IsOptional()
  @IsBoolean()
  isHidden = true;
}

export class CreateQuestionDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  position!: number;

  @Type(() => Number)
  @Min(0)
  score!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(ProgrammingLanguage, { each: true })
  allowedLanguages!: ProgrammingLanguage[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateTestCaseDto)
  testCases!: CreateTestCaseDto[];
}
