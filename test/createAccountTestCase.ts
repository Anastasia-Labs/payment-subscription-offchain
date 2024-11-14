import { createAccount, CreateAccountConfig } from "../src/index.js";
import { Effect } from "effect";
import { LucidContext } from "./service/lucidContext.js";
import { accountScript } from "./common/constants.js";

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
            scripts: accountScript,
        };

        const createAccountFlow = Effect.gen(function* (_) {
            const createAccountResult = yield* createAccount(
                lucid,
                accountConfig,
            );
            const createAccountSigned = yield* Effect.promise(() =>
                createAccountResult.sign.withWallet().complete()
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
