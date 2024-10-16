import {
    Emulator,
    generateEmulatorAccount,
    Lucid,
    LucidEvolution,
    Maestro,
    PROTOCOL_PARAMETERS_DEFAULT,
} from "@lucid-evolution/lucid";
import { Effect } from "effect";
import dotenv from "dotenv";
import { generateAccountSeedPhrase } from "../../src";
dotenv.config();

export type LucidContext = {
    lucid: LucidEvolution;
    users: any;
    emulator?: Emulator;
};

export type Network = "Mainnet" | "Preprod" | "Preview";

export const makeEmulatorContext = () =>
    Effect.gen(function* ($) {
        const WALLET_SEED = process.env.SUBSCRIBER_WALLET_SEED!;
        const users = {
            subscriber: yield* Effect.sync(() =>
                generateEmulatorAccount({ lovelace: BigInt(1_000_000_000) })
            ),
            merchant: yield* Effect.sync(() =>
                generateEmulatorAccount({ lovelace: BigInt(1_000_000_000) })
            ),
        };

        const emulator = new Emulator([users.subscriber, users.merchant], {
            ...PROTOCOL_PARAMETERS_DEFAULT,
            maxTxSize: 21000,
        });

        const network = "Custom";
        const lucid = yield* Effect.promise(() => Lucid(emulator, network));
        lucid.selectWallet.fromSeed(WALLET_SEED);

        // const getCurrentTime = BigInt(emulator.now());
        // const selectSubscriberWallet = lucid.selectWallet.fromSeed(
        //     users.subscriber.seedPhrase,
        // );

        // const awaitTx = yield* Effect.sync(() => emulator.awaitBlock(50));

        return { lucid, users, emulator } as LucidContext;
    });

export const makeMaestroContext = (
    network: Network,
) => Effect.gen(function* ($) {
    const API_KEY = process.env.API_KEY!;
    const WALLET_SEED = process.env.SUBSCRIBER_WALLET_SEED!;

    if (!API_KEY) {
        throw new Error(
            "Missing required environment variables for Maestro context.",
        );
    }

    console.log("network: ", network);

    const maestro = new Maestro({
        network: network,
        apiKey: API_KEY,
        turboSubmit: false,
    });

    const lucid = yield* Effect.promise(() => Lucid(maestro, network));
    const seed = yield* Effect.promise(() =>
        generateAccountSeedPhrase({ lovelace: BigInt(1_000_000_000) })
    );
    console.log("Seed: ", seed);

    const users = lucid.selectWallet.fromSeed(WALLET_SEED);

    console.log("Maestro API Key: ", API_KEY);

    return { lucid, users, emulator: undefined } as unknown as LucidContext;
});

export const makeLucidContext = (
    network?: Network,
) => Effect.gen(function* ($) {
    // const MAESTRO_API_URL = process.env.MAESTRO_API_URL;
    const API_KEY = process.env.API_KEY;
    // const WALLET_SEED = process.env.WALLET_SEED;
    const selectedNetwork = network ?? "Preprod"; // Default to Preprod if not specified

    if (API_KEY && network) {
        // Use Maestro context
        console.log("Maestro Target: ");
        return yield* $(makeMaestroContext(selectedNetwork));
    } else {
        // Use Emulator context
        console.log("Emuletor Target: ");
        return yield* $(makeEmulatorContext());
    }
});
