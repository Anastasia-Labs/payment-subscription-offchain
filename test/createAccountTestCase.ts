import {
    createAccount,
    CreateAccountConfig,
    mintingPolicyToId,
    toUnit,
    Unit,
    UTxO,
    validatorToAddress,
} from "../src/index.js";
import { expect, test } from "vitest";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext, makeLucidContext } from "./emulator/service.js";
import { findCip68TokenNames } from "../src/core/utils/assets.js";

const accountValidator = readMultiValidators(blueprint, false, []);
const accountPolicyId = mintingPolicyToId(accountValidator.mintAccount);

export type CreateAccountResult = {
    txHash: string;
    accountConfig: CreateAccountConfig;
    outputs: {
        subscriberUTxOs: UTxO[];
        accountUTxOs: UTxO[];
        // userNft: Unit;
        // refNft: Unit;
    };
};

export const createAccountTestCase = (
    { lucid, users, emulator }: LucidContext,
): Effect.Effect<CreateAccountResult, Error, never> => {
    return Effect.gen(function* () {
        console.log("createAccountTestCase...: ");

        const accountScript = {
            spending: accountValidator.spendAccount.script,
            minting: accountValidator.mintAccount.script,
            staking: "",
        };

        let currentTime: bigint;

        if (emulator) {
            currentTime = BigInt(emulator.now());
            lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
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
            console.log("Tumefika hapa?: ");
            const createAccountResult = yield* createAccount(
                lucid,
                accountConfig,
            );
            // console.log("Tumepita hapa?: ");
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

        let subscriberUTxOs: UTxO[];
        let accountUTxOs: UTxO[];
        let accountAddress: string;
        if (emulator) {
            yield* Effect.sync(() => emulator.awaitBlock(50));
            accountAddress = validatorToAddress(
                "Custom",
                accountValidator.mintAccount,
            );
            subscriberUTxOs = yield* Effect.promise(() =>
                lucid.utxosAt(users.subscriber.address)
            );
            accountUTxOs = yield* Effect.promise(() =>
                lucid.utxosAt(accountAddress)
            );
        } else {
            const subscriberAddress = yield* Effect.promise(() =>
                lucid.wallet().address()
            );
            accountAddress = validatorToAddress(
                "Preprod",
                accountValidator.mintAccount,
            );
            subscriberUTxOs = yield* Effect.promise(() =>
                lucid.utxosAt(subscriberAddress)
            );

            console.log("Account Address: ", accountAddress);

            accountUTxOs = yield* Effect.promise(() =>
                lucid.utxosAt(accountAddress)
            );
        }

        // // Find the token names
        // const { refTokenName, userTokenName } = findCip68TokenNames([
        //     ...accountUTxOs,
        //     ...subscriberUTxOs,
        // ], accountPolicyId);

        // const userNft = toUnit(
        //     accountPolicyId,
        //     userTokenName,
        // );

        // const refNft = toUnit(
        //     accountPolicyId,
        //     refTokenName,
        // );

        // const [subscriberUTxOs, accountUTxOs] = yield* Effect.all([
        //   Effect.promise(() => lucid.utxosAt(users.subscriber.address)),
        //   Effect.promise(() => lucid.utxosAt(accountAddress)),
        // ]);

        return {
            txHash: createAccountResult,
            accountConfig,
            outputs: {
                subscriberUTxOs,
                accountUTxOs,
                // userNft,
                // refNft,
            },
        };
    });
};
