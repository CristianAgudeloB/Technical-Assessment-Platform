import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAssessmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  durationMinutes!: number;
}
