import { Module } from '@nestjs/common';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

import { SchoolSettingsController } from './school-settings.controller';
import { SchoolSettingsService } from './school-settings.service';

@Module({
  controllers: [AdminDashboardController, SchoolSettingsController],
  providers: [AdminDashboardService, SchoolSettingsService],
  exports: [AdminDashboardService, SchoolSettingsService],
})
export class AdminModule {}
