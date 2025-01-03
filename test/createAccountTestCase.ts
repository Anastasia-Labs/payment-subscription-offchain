import { CreateAccountConfig, createAccountProgram } from "../src/index.js";
import { Effect } from "effect";
import { LucidContext } from "./service/lucidContext.js";

export type CreateAccountResult = {
    txHash: string;
    accountConfig: CreateAccountConfig;
};

export const createAccountTestCase = (
    { lucid, users, emulator }: LucidContext,
): Effect.Effect<CreateAccountResult, Error, never> => {
    return Effect.gen(function* () {
        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        let currentTime: bigint;

        if (emulator) {
            currentTime = BigInt(emulator.now());
        } else {
            currentTime = BigInt(Date.now());
        }
        const accountConfig: CreateAccountConfig = {
            email: "business@web3.ada",
            phone: "288-481-2686",
            account_created: currentTime,
        };

        const createAccountFlow = Effect.gen(function* (_) {
            const createAccountUnsigned = yield* createAccountProgram(
                lucid,
                accountConfig,
            );
            const createAccountSigned = yield* Effect.promise(() =>
                createAccountUnsigned.sign.withWallet().complete()
            );
            const createAccountHash = yield* Effect.promise(() =>
                createAccountSigned.submit()
            );

            return createAccountHash;
        });

        const createAccountResult = yield* createAccountFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error creating Account: ${error}`)
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );

        return {
            txHash: createAccountResult,
            accountConfig,
        };
    });
};
