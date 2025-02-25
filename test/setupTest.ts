import {
  Network,
  UTxO,
  validatorToAddress,
} from "@lucid-evolution/lucid";
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
  intervalLength?: bigint
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

    console.log("Final Setup Results:", {
      service: {
        serviceNftTn: result.serviceNftTn,
        merchantNftTn: result.merchantNftTn,
        serviceUTxOsCount: result.serviceUTxOs.length,
        merchantUTxOsCount: result.merchantUTxOs.length,
      },
      account: {
        accountNftTn: result.accountNftTn,
        subscriberNftTn: result.subscriberNftTn,
        accountUTxOsCount: result.accountUTxOs.length,
        subscriberUTxOsCount: result.subscriberUTxOs.length,
      },
    });

    return result;
  });
};

// export const setupTest = (): Effect.Effect<SetupResult, Error, never> => {
//   return Effect.gen(function* (_) {
//     const { lucid, users, emulator } = yield* makeLucidContext();
//     const network = lucid.config().network;
//     if (!network) {
//       throw Error("Invalid Network selection");
//     }
//     let currentTime: bigint;

//     // If using emulator, perform necessary setup
//     if (emulator && network === "Custom") {
//       // Create account and service if they don't exist
//       const accountResult = yield* createAccountTestCase({
//         lucid,
//         users,
//         emulator,
//       });
//       const serviceResult = yield* createServiceTestCase({
//         lucid,
//         users,
//         emulator,
//       });

//       yield* Effect.sync(() => emulator.awaitBlock(10));

//       currentTime = BigInt(emulator.now());
//     } else {
//       currentTime = BigInt(Date.now());
//     }

//     const paymentAddress = validatorToAddress(
//       network,
//       paymentValidator.spendPayment,
//     );

//     lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
//     const merchantAddress: Address = yield* Effect.promise(() =>
//       lucid.wallet().address()
//     );
//     const merchantUTxOs = yield* Effect.promise(() =>
//       lucid.utxosAt(merchantAddress)
//     );

//     const serviceAddress = validatorToAddress(
//       network,
//       serviceValidator.spendService,
//     );

//     const serviceUTxOs = yield* Effect.promise(() =>
//       lucid.utxosAt(serviceAddress)
//     );
//     console.log("Setup context: ", serviceUTxOs);

//     // Find CIP68 Token Names
//     const { refTokenName: serviceNftTn, userTokenName: merchantNftTn } =
//       findCip68TokenNames(
//         serviceUTxOs,
//         merchantUTxOs,
//         servicePolicyId,
//       );

//     lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
//     const subscriberAddress: Address = yield* Effect.promise(() =>
//       lucid.wallet().address()
//     );

//     const subscriberUTxOs = yield* Effect.promise(() =>
//       lucid.utxosAt(subscriberAddress)
//     );

//     // Get necessary addresses
//     const accountAddress = validatorToAddress(
//       network,
//       accountValidator.spendAccount,
//     );

//     // Fetch UTxOs
//     const accountUTxOs = yield* Effect.promise(() =>
//       lucid.utxosAt(accountAddress)
//     );

//     const { refTokenName: accountNftTn, userTokenName: subscriberNftTn } =
//       findCip68TokenNames(
//         subscriberUTxOs,
//         accountUTxOs,
//         accountPolicyId,
//       );

//     return {
//       context: { lucid, users, emulator },
//       serviceNftTn,
//       merchantNftTn,
//       accountNftTn,
//       subscriberNftTn,
//       serviceUTxOs,
//       accountUTxOs,
//       merchantUTxOs,
//       subscriberUTxOs,
//       currentTime,
//     };
//   });
// };

export type AccountSetup = BaseSetup & {
  accountNftTn: string;
  subscriberNftTn: string;
  accountUTxOs: UTxO[];
  subscriberUTxOs: UTxO[];
};

// Setup functions for different contexts
export const setupBase = (intervalLength?: bigint): Effect.Effect<BaseSetup, Error, never> => {
  const interval_length = intervalLength || 60n * 1000n * 2n
  return Effect.gen(function* (_) {
    const { lucid, users, emulator } = yield* makeLucidContext();
    const network = lucid.config().network;
    if (!network) throw Error("Invalid Network selection");

    const currentTime = emulator && network === "Custom"
      ? BigInt(emulator.now())
      : BigInt(Date.now());

    return {
      network,
      context: { lucid, users, emulator },
      currentTime,
      intervalLength: interval_length
    };
  });
}

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
      yield* createServiceTestCase({ lucid, users, emulator }, base.intervalLength);
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
      findCip68TokenNames(serviceUTxOs, merchantUTxOs, servicePolicyId);

    return {
      ...base,
      serviceNftTn,
      merchantNftTn,
      serviceUTxOs,
      merchantUTxOs,
    };
  });
