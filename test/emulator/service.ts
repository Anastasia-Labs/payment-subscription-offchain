import {
    Emulator,
    generateEmulatorAccount,
    Lucid,
    LucidEvolution,
    PROTOCOL_PARAMETERS_DEFAULT,
} from "@lucid-evolution/lucid";
import { Effect } from "effect";

export type LucidContext = {
    lucid: LucidEvolution;
    users: any;
    emulator: Emulator;
};

export const makeLucidContext = Effect.gen(function* ($) {
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

    const lucid = yield* Effect.promise(() => Lucid(emulator, "Custom"));

    return { lucid, users, emulator } as LucidContext;
});
