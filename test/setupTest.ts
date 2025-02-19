import { Address, UTxO, validatorToAddress } from "@lucid-evolution/lucid";
import { LucidContext, makeLucidContext } from "./service/lucidContext";
import { Effect } from "effect";
import { createAccountTestCase } from "./createAccountTestCase";
import { createServiceTestCase } from "./createServiceTestCase";
import { findCip68TokenNames } from "../src/core/utils/assets";
import {
  accountPolicyId,
  accountValidator,
  paymentValidator,
  servicePolicyId,
  serviceValidator,
} from "../src/core/validators/constants";

export type SetupResult = {
  context: LucidContext;
  serviceNftTn: string;
  merchantNftTn: string;
  accountNftTn: string;
  subscriberNftTn: string;
  serviceUTxOs: UTxO[];
  accountUTxOs: UTxO[];
  merchantUTxOs: UTxO[];
  subscriberUTxOs: UTxO[];
  currentTime: bigint;
};

export const setupTest = (): Effect.Effect<SetupResult, Error, never> => {
  return Effect.gen(function* (_) {
    const { lucid, users, emulator } = yield* makeLucidContext();
    const network = lucid.config().network;
    if (!network) {
      throw Error("Invalid Network selection");
    }
    let currentTime: bigint;

    // If using emulator, perform necessary setup
    if (emulator && network === "Custom") {
      // Create account and service if they don't exist
      const accountResult = yield* createAccountTestCase({
        lucid,
        users,
        emulator,
      });
      const serviceResult = yield* createServiceTestCase({
        lucid,
        users,
        emulator,
      });

      yield* Effect.sync(() => emulator.awaitBlock(10));

      currentTime = BigInt(emulator.now());
    } else {
      currentTime = BigInt(Date.now());
    }

    const paymentAddress = validatorToAddress(
      network,
      paymentValidator.spendPayment,
    );

    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
    const merchantAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );
    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(merchantAddress)
    );

    const serviceAddress = validatorToAddress(
      network,
      serviceValidator.spendService,
    );

    const serviceUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(serviceAddress)
    );

    // Find CIP68 Token Names
    const { refTokenName: serviceNftTn, userTokenName: merchantNftTn } =
      findCip68TokenNames(
        [serviceUTxOs[0], merchantUTxOs[0]],
        servicePolicyId,
      );

    lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
    const subscriberAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const subscriberUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(subscriberAddress)
    );

    // Get necessary addresses
    const accountAddress = validatorToAddress(
      network,
      accountValidator.spendAccount,
    );

    // Fetch UTxOs
    const accountUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(accountAddress)
    );

    const { refTokenName: accountNftTn, userTokenName: subscriberNftTn } =
      findCip68TokenNames(
        [accountUTxOs[0], subscriberUTxOs[0]],
        accountPolicyId,
      );

    return {
      context: { lucid, users, emulator },
      serviceNftTn,
      merchantNftTn,
      accountNftTn,
      subscriberNftTn,
      serviceUTxOs,
      accountUTxOs,
      merchantUTxOs,
      subscriberUTxOs,
      currentTime,
    };
  });
};
