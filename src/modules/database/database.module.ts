import { Global, Module } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../db/schema';

export const DRIZZLE_PROVIDER = 'DRIZZLE_PROVIDER';

export type DrizzleConnection = ReturnType<typeof drizzle>;

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE_PROVIDER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL');
        const queryClient = postgres(connectionString!);
        return drizzle(queryClient, { schema });
      },
    },
  ],
  exports: [DRIZZLE_PROVIDER],
})
export class DatabaseModule {}
