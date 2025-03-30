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

export const NETWORK = (process.env.NETWORK as Network) || "Preprod";

export const makeEmulatorContext = () =>
    Effect.gen(function* (_) {
        const users = {
            dappProvider: yield* Effect.sync(() =>
                generateEmulatorAccount({ lovelace: BigInt(1_000_000_000) })
            ),
            subscriber: yield* Effect.sync(() =>
                generateEmulatorAccount({ lovelace: BigInt(1_000_000_000) })
            ),
            merchant: yield* Effect.sync(() =>
                generateEmulatorAccount({ lovelace: BigInt(1_000_000_000) })
            ),
        };

        const emulator = new Emulator(
            [users.dappProvider, users.subscriber, users.merchant],
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
        const DAPP_PROVIDER_SEED = process.env.DAPP_PROVIDER_SEED!;
        const SUBSCRIBER_WALLET_SEED = process.env.SUBSCRIBER_WALLET_SEED!;
        const MERCHANT_WALLET_SEED = process.env.MERCHANT_WALLET_SEED!;

        if (!API_KEY) {
            throw new Error(
                "Missing required environment variables for Maestro context.",
            );
        }

        if (network === "Custom") {
            throw new Error(
                "Cannot create Maestro context with 'Custom' network.",
            );
        }

        const users = {
            dappProvider: {
                seedPhrase: DAPP_PROVIDER_SEED,
            },
            subscriber: {
                seedPhrase: SUBSCRIBER_WALLET_SEED,
            },
            merchant: {
                seedPhrase: MERCHANT_WALLET_SEED,
            },
        };

        const maestro = new Maestro({
            network: network,
            apiKey: API_KEY,
            turboSubmit: false,
        });

        const lucid = yield* Effect.promise(() => Lucid(maestro, network));
        // const seed = yield* Effect.promise(() =>
        //     generateAccountSeedPhrase({ lovelace: BigInt(1_000_000_000) })
        // );

        // console.log("Seed Phrase: ", seed);
        return { lucid, users, emulator: undefined } as LucidContext;
    });

export const makeLucidContext = (network?: Network) =>
    Effect.gen(function* ($) {
        const API_KEY = process.env.API_KEY;

        const selectedNetwork = network ?? NETWORK; // Default to Preprod if not specified
        // console.log("selectedNetwork", selectedNetwork);
        if (API_KEY && selectedNetwork && selectedNetwork !== "Custom") {
            // Use Maestro context
            console.log("selectedNetwork", selectedNetwork);
            return yield* $(makeMaestroContext(selectedNetwork));
        } else {
            // Use Emulator context
            console.log("selectedNetwork: Emulator");
            return yield* $(makeEmulatorContext());
        }
    });
