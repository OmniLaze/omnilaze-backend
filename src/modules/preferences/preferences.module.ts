import { Module } from '@nestjs/common';
import { PreferencesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';
import { ConfigModule } from '../../config/config.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Module({
  imports: [ConfigModule],
  controllers: [PreferencesController],
  providers: [PreferencesService, JwtAuthGuard],
})
export class PreferencesModule {}


