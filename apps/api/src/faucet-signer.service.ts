import {
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Keyring } from "@polkadot/keyring";
import type { KeyringPair } from "@polkadot/keyring/types";
import { cryptoWaitReady } from "@polkadot/util-crypto";

@Injectable()
export class FaucetSignerService {
  private initialized = false;
  private signerAddress: string | null = null;
  private signerPair: KeyringPair | null = null;
  private initialization: Promise<string> | null = null;

  async getAddress(): Promise<string> {
    if (this.initialized && this.signerAddress) {
      return this.signerAddress;
    }

    if (!this.initialization) {
      this.initialization = this.initializeSigner();
    }

    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }

  async getVerifiedPair(): Promise<KeyringPair> {
    await this.getAddress();

    if (!this.signerPair) {
      throw new ServiceUnavailableException(
        "Faucet signer is unavailable.",
      );
    }

    return this.signerPair;
  }

  private async initializeSigner(): Promise<string> {
    const secretUri = process.env.FAUCET_SIGNER_URI?.trim();
    const expectedAddress = process.env.FAUCET_ADDRESS?.trim();

    if (!secretUri || !expectedAddress) {
      throw new ServiceUnavailableException(
        "Faucet signer is not configured.",
      );
    }

    try {
      const ready = await cryptoWaitReady();

      if (!ready) {
        throw new Error("Cryptographic initialization failed.");
      }

      const keyring = new Keyring({
        type: "sr25519",
        ss58Format: 42,
      });

      const pair = keyring.addFromUri(secretUri, {}, "sr25519");

      if (pair.address !== expectedAddress) {
        throw new Error("Configured faucet address does not match signer.");
      }

      this.signerPair = pair;
      this.signerAddress = pair.address;
      this.initialized = true;

      return pair.address;
    } catch {
      throw new ServiceUnavailableException(
        "Faucet signer initialization failed. Check the server configuration.",
      );
    }
  }
}
