import { Module } from '@nestjs/common';
import { CODE_EXECUTION_PORT } from './domain/code-execution.port';
import {
  createJudge0AdapterOptions,
  Judge0Adapter,
  JUDGE0_ADAPTER_OPTIONS,
} from './infrastructure/judge0/judge0.adapter';

@Module({
  providers: [
    {
      provide: JUDGE0_ADAPTER_OPTIONS,
      useFactory: () => createJudge0AdapterOptions(process.env),
    },
    Judge0Adapter,
    {
      provide: CODE_EXECUTION_PORT,
      useExisting: Judge0Adapter,
    },
  ],
  exports: [CODE_EXECUTION_PORT],
})
export class ExecutionModule {}
