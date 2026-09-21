import { IsDateString, IsString, MaxLength } from 'class-validator';

export class AssignAssessmentDto {
  @IsString()
  @MaxLength(100)
  candidateId!: string;

  @IsString()
  @MaxLength(100)
  assessmentId!: string;

  @IsDateString()
  availableFrom!: string;

  @IsDateString()
  availableUntil!: string;
}
