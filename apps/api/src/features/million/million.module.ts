import { Module } from '@nestjs/common';
import { MillionRoomsController } from './million.rooms.controller';
import { MillionGateway } from './million.gateway';

/**
 * Million Dialogue Module
 * Provides Million multiplayer quiz functionality
 */
@Module({
  imports: [],
  controllers: [MillionRoomsController],
  providers: [MillionGateway],
})
export class MillionModule {}
