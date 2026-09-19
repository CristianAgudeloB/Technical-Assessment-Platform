import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ProgrammingLanguage } from '../../../question/domain/question';

export class CreateSubmissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  assessmentAttemptId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  questionId!: string;

  @IsEnum(ProgrammingLanguage)
  language!: ProgrammingLanguage;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30_000)
  sourceCode!: string;
}
