import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  controllers: [UserController],
  imports: [UploadModule],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
