import {
    CreateAccountConfig,
    createAccountProgram,
    selectUTxOs,
} from "../src/index.js";
import { Effect } from "effect";
import { LucidContext } from "./service/lucidContext.js";

export type CreateAccountResult = {
    txHash: string;
    accountConfig: CreateAccountConfig;
};

export const createAccountTestCase = (
    { lucid, users }: LucidContext,
): Effect.Effect<CreateAccountResult, Error, never> => {
    return Effect.gen(function* () {
        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
        const address = yield* Effect.promise(() => lucid.wallet().address());
        const utxos = yield* Effect.promise(() => lucid.utxosAt(address));
        const selectedUTxOs = selectUTxOs(utxos, { ["lovelace"]: 2000000n });

        if (!selectedUTxOs || !selectedUTxOs.length) {
            console.error("No selectable UTxO found at address: " + address);
        }

        const selectedUTxO = selectedUTxOs[0];
        const accountConfig: CreateAccountConfig = {
            selected_out_ref: selectedUTxO,
            email: "business@web3.ada",
            phone: "288-481-2686",
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
