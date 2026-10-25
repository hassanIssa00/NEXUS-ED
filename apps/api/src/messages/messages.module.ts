import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { EventsModule } from '../gateway/events.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [EventsModule, UploadModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
