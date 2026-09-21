import { ProgrammingLanguage } from '../../question/domain/question';

export const CODE_QUALITY_PORT = Symbol('CODE_QUALITY_PORT');

export type CodeQualityIssue = {
  type: 'BUG' | 'CODE_SMELL' | 'VULNERABILITY';
  severity: string;
  message: string;
  rule: string;
  line: number | null;
};

export type CodeQualityAnalysis = {
  status: 'COMPLETED' | 'SKIPPED';
  qualityGateStatus: string | null;
  issues: CodeQualityIssue[];
  totalIssues: number;
  bugs: number;
  codeSmells: number;
  vulnerabilities: number;
  message: string | null;
};

export type AnalyzeCodeQualityRequest = {
  submissionId: string;
  language: ProgrammingLanguage;
  sourceCode: string;
};

export interface CodeQualityPort {
  analyze(request: AnalyzeCodeQualityRequest): Promise<CodeQualityAnalysis>;
}
