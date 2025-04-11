import { Network, UTxO, validatorToAddress } from "@lucid-evolution/lucid";
import { LucidContext, makeLucidContext } from "./service/lucidContext";
import { Effect } from "effect";
import { createAccountTestCase } from "./createAccountTestCase";
import { createServiceTestCase } from "./createServiceTestCase";
import { findCip68TokenNames } from "../src/core/utils/assets";
import {
  accountPolicyId,
  accountValidator,
  servicePolicyId,
  serviceValidator,
} from "../src/core/validators/constants";

export type BaseSetup = {
  network: Network;
  context: LucidContext;
  currentTime: bigint;
  intervalLength: bigint;
};

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

export type SetupType = "all" | "account" | "service";

export const setupTest = (
  intervalLength?: bigint,
): Effect.Effect<SetupResult, Error, never> => {
  return Effect.gen(function* (_) {
    // Start with base setup
    const base = yield* setupBase(intervalLength);
    const { emulator } = base.context;

    // Initialize empty return values
    let result: SetupResult = {
      context: base.context,
      serviceNftTn: "",
      merchantNftTn: "",
      accountNftTn: "",
      subscriberNftTn: "",
      serviceUTxOs: [],
      accountUTxOs: [],
      merchantUTxOs: [],
      subscriberUTxOs: [],
      currentTime: base.currentTime,
    };

    // Run service setup with the base context
    const serviceSetup = yield* setupService(base);

    // const serviceSetup = yield* setupService().pipe(
    //   Effect.provide(base)
    // );

    // Wait for blocks after service setup
    if (emulator && base.network === "Custom") {
      yield* Effect.sync(() => emulator.awaitBlock(5));
    }

    const accountSetup = yield* setupAccount(base);

    // Wait for blocks after account setup
    if (emulator && base.network === "Custom") {
      yield* Effect.sync(() => emulator.awaitBlock(5));
    }

    result = {
      ...result,
      // Service results
      serviceNftTn: serviceSetup.serviceNftTn,
      merchantNftTn: serviceSetup.merchantNftTn,
      serviceUTxOs: serviceSetup.serviceUTxOs,
      merchantUTxOs: serviceSetup.merchantUTxOs,
      // Account results
      accountNftTn: accountSetup.accountNftTn,
      subscriberNftTn: accountSetup.subscriberNftTn,
      accountUTxOs: accountSetup.accountUTxOs,
      subscriberUTxOs: accountSetup.subscriberUTxOs,
    };

    return result;
  });
};

export type AccountSetup = BaseSetup & {
  accountNftTn: string;
  subscriberNftTn: string;
  accountUTxOs: UTxO[];
  subscriberUTxOs: UTxO[];
};

// Setup functions for different contexts
export const setupBase = (
  intervalLength?: bigint,
): Effect.Effect<BaseSetup, Error, never> => {
  const interval_length = intervalLength || 2n * 60n * 1000n;
  return Effect.gen(function* (_) {
    const { lucid, users, emulator } = yield* makeLucidContext();
    const network = lucid.config().network;
    if (!network) throw Error("Invalid Network selection");

    const currentTime = BigInt((emulator && lucid.config().network === "Custom") ? emulator.now() : Date.now());

    return {
      network,
      context: { lucid, users, emulator },
      currentTime: BigInt(currentTime),
      intervalLength: interval_length,
    };
  });
};

export const setupAccount = (
  base: BaseSetup,
): Effect.Effect<AccountSetup, Error, never> =>
  Effect.gen(function* (_) {
    // const base = yield* setupBase();
    const { lucid, users, emulator } = base.context;
    // const network = lucid.config().network;

    if (emulator && base.network === "Custom") {
      yield* createAccountTestCase({ lucid, users, emulator });
      yield* Effect.sync(() => emulator.awaitBlock(10));
    }

    lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
    const subscriberAddress = yield* Effect.promise(() =>
      lucid.wallet().address()
    );
    const subscriberUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(subscriberAddress)
    );

    const accountAddress = validatorToAddress(
      base.network,
      accountValidator.spendAccount,
    );
    const accountUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(accountAddress)
    );

    const { refTokenName: accountNftTn, userTokenName: subscriberNftTn } =
      findCip68TokenNames(subscriberUTxOs, accountUTxOs, accountPolicyId);

    return {
      ...base,
      accountNftTn,
      subscriberNftTn,
      accountUTxOs,
      subscriberUTxOs,
    };
  });

export type ServiceSetup = BaseSetup & {
  serviceNftTn: string;
  merchantNftTn: string;
  serviceUTxOs: UTxO[];
  merchantUTxOs: UTxO[];
  intervalLength: bigint;
};

export const setupService = (
  base: BaseSetup,
): Effect.Effect<ServiceSetup, Error, never> =>
  Effect.gen(function* (_) {
    const { lucid, users, emulator } = base.context;
    // const network = lucid.config().network;

    if (emulator && base.network === "Custom") {
      yield* createServiceTestCase(
        { lucid, users, emulator },
        base.intervalLength,
      );
      yield* Effect.sync(() => emulator.awaitBlock(10));
    }

    lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
    const merchantAddress = yield* Effect.promise(() =>
      lucid.wallet().address()
    );
    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(merchantAddress)
    );

    const serviceAddress = validatorToAddress(
      base.network,
      serviceValidator.spendService,
    );
    const serviceUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(serviceAddress)
    );

    const { refTokenName: serviceNftTn, userTokenName: merchantNftTn } =
      findCip68TokenNames(merchantUTxOs, serviceUTxOs, servicePolicyId);

    console.log("merchantUTxOs:", merchantUTxOs);
    console.log("serviceUTxOs:", serviceUTxOs);
    console.log("serviceNftTn:", serviceNftTn);

    return {
      ...base,
      serviceNftTn,
      merchantNftTn,
      serviceUTxOs,
      merchantUTxOs,
    };
  });
