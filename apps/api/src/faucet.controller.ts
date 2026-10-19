import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
  Post,
  Query,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { FaucetService } from "./faucet.service";

@Controller("faucet")
export class FaucetController {
  constructor(private readonly faucetService: FaucetService) {}

  @Get("config")
  getConfig() {
    return this.faucetService.getConfig();
  }

  @Get("history")
  getHistory(
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.faucetService.getHistory(limit);
  }

  @Get("eligibility/:walletAddress")
  getEligibility(@Param("walletAddress") walletAddress: string) {
    return this.faucetService.getEligibility(walletAddress);
  }

  @Post("claim")
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  claim(@Body("walletAddress") walletAddress: string) {
    return this.faucetService.claim(walletAddress);
  }
}
