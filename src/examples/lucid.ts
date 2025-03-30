import {
  Emulator,
  generateEmulatorAccount,
  Lucid,
  LucidEvolution,
  Maestro,
  PROTOCOL_PARAMETERS_DEFAULT,
} from "@lucid-evolution/lucid";
import { Effect } from "effect";

export type LucidContext = {
  lucid: LucidEvolution;
  users: any;
  emulator?: Emulator;
};

export type Network = "Mainnet" | "Preprod" | "Preview" | "Custom";

export const makeEmulatorContext = () =>
  Effect.gen(function* (_) {
      const generateAccount = () => generateEmulatorAccount({ lovelace: BigInt(1_000_000_000) })
      const users = {
          subscriber: yield* Effect.sync(generateAccount),
          merchant: yield* Effect.sync(generateAccount),
      };

      const emulator = new Emulator(
          [users.subscriber, users.merchant],
          {
              ...PROTOCOL_PARAMETERS_DEFAULT,
              maxTxSize: 23000,
          },
      );

      const lucid = yield* Effect.promise(() => Lucid(emulator, "Custom"));
      return { lucid, users, emulator } as LucidContext;
  });

export const makeMaestroContext = (network: Network) =>
  Effect.gen(function* (_) {
      const API_KEY = process.env.API_KEY!;
      const SUBSCRIBER_WALLET_SEED = process.env.SUBSCRIBER_WALLET_SEED!;
      const MERCHANT_WALLET_SEED = process.env.MERCHANT_WALLET_SEED!;

      if (!API_KEY) {
          throw new Error("Missing required environment variables for Maestro context.");
      }

      if (network === "Custom") {
          throw new Error("Cannot create Maestro context with 'Custom' network.");
      }

      const users = {
          subscriber: { seedPhrase: SUBSCRIBER_WALLET_SEED },
          merchant: { seedPhrase: MERCHANT_WALLET_SEED },
      };

      const maestro = new Maestro({
          network: network,
          apiKey: API_KEY,
          turboSubmit: false,
      });

      const lucid = yield* Effect.promise(() => Lucid(maestro, network));
      return { lucid, users, emulator: undefined } as LucidContext;
  });

export const makeLucidContext = (network?: Network) =>
  Effect.runPromise(Effect.gen(function* ($) {
      const API_KEY = process.env.API_KEY;
      const NETWORK = (process.env.NETWORK as Network) || "Preprod";

      const selectedNetwork = network ?? NETWORK;
      if (API_KEY && selectedNetwork && selectedNetwork !== "Custom") {
          console.log("selectedNetwork", selectedNetwork);
          return yield* $(makeMaestroContext(selectedNetwork));
      } else {
          console.log("selectedNetwork: Emulator");
          return yield* $(makeEmulatorContext());
      }
  }))
