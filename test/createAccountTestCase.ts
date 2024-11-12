import {
    Address,
    createAccount,
    CreateAccountConfig,
    mintingPolicyToId,
    toUnit,
    Unit,
    UTxO,
    validatorToAddress,
} from "../src/index.js";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext } from "./service/lucidContext.js";

const accountValidator = readMultiValidators(blueprint, false, []);

const accountScript = {
    spending: accountValidator.spendAccount.script,
    minting: accountValidator.mintAccount.script,
    staking: "",
};

export type CreateAccountResult = {
    txHash: string;
    accountConfig: CreateAccountConfig;
};

export const createAccountTestCase = (
    { lucid, users, emulator }: LucidContext,
): Effect.Effect<CreateAccountResult, Error, never> => {
    return Effect.gen(function* () {
        const network = lucid.config().network;
        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        let currentTime: bigint;

        if (emulator) {
            currentTime = BigInt(emulator.now());
            // lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
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

        const accountAddress: Address = validatorToAddress(
            network,
            accountValidator.mintAccount,
        );
        if (emulator) {
            yield* Effect.sync(() => emulator.awaitBlock(10));

            // lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
        } else {
            // accountAddress = validatorToAddress(
            //     "Preprod",
            //     accountValidator.mintAccount,
            // );
        }

        // const subscriberAddress: Address = yield* Effect.promise(() =>
        //     lucid.wallet().address()
        // );
        // const subscriberUTxOs = yield* Effect.promise(() =>
        //     lucid.utxosAt(subscriberAddress)
        // );

        // const accountUTxOs = yield* Effect.promise(() =>
        //     lucid.config().provider.getUtxos(accountAddress)
        // );

        // console.log("Account Address: ", accountAddress);
        // console.log("AccountUTxOs: ", accountUTxOs);

        return {
            txHash: createAccountResult,
            accountConfig,
        };
    });
};
