import { Inject, Injectable } from '@nestjs/common';
import { PublicUser } from '../../auth/domain/user';
import { USER_REPOSITORY, UserRepository } from '../../auth/domain/user.repository';

@Injectable()
export class ListCandidatesUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  execute(): Promise<PublicUser[]> {
    return this.userRepository.findCandidates();
  }
}
