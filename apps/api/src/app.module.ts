import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { FaucetController } from "./faucet.controller";
import { FaucetService } from "./faucet.service";
import { FaucetSignerService } from "./faucet-signer.service";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma.module";

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 30,
      },
    ]),
  ],
  controllers: [HealthController, FaucetController],
  providers: [FaucetService, FaucetSignerService],
})
export class AppModule {}
