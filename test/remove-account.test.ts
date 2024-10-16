import { removeAccount, RemoveAccountConfig, toUnit } from "../src/index.js";
import { beforeAll, expect, test } from "vitest";
import {
    Address,
    mintingPolicyToId,
    validatorToAddress,
} from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
// import { findCip68TokenNames } from "../src/core/utils/assets.js";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import {
    LucidContext,
    makeEmulatorContext,
    makeLucidContext,
} from "./emulator/service.js";
import { extractTokens, getValidatorDatum } from "../src/endpoints/utils.js";
import { createAccountTestCase } from "./createAccountTestCase.js";

const accountValidator = readMultiValidators(blueprint, false, []);
const accountPolicyId = mintingPolicyToId(accountValidator.mintAccount);

const accountScript = {
    spending: accountValidator.spendAccount.script,
    minting: accountValidator.mintAccount.script,
    staking: "",
};

type RemoveAccountResult = {
    txHash: string;
};

export const removeAccountTestCase = (
    { lucid, users, emulator }: LucidContext,
): Effect.Effect<RemoveAccountResult, Error, never> => {
    return Effect.gen(function* () {
        console.log(
            `removeAccountTestCase: emulator is ${
                emulator ? "defined" : "undefined"
            }, network is ${lucid.config().network}`,
        );
        let removeAccountConfig: RemoveAccountConfig;

        if (emulator && lucid.config().network === "Custom") {
            console.log("Emulator is being Triggerred...: ");

            const createAccountResult = yield* createAccountTestCase({
                lucid,
                users,
                emulator,
            });

            expect(createAccountResult).toBeDefined();
            expect(typeof createAccountResult.txHash).toBe("string"); // Assuming the createAccountResult is a transaction hash
            yield* Effect.sync(() => emulator.awaitBlock(50));
            lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

            const accountAddress = validatorToAddress(
                "Custom",
                accountValidator.mintAccount,
            );

            const accountUTxOs = yield* Effect.promise(() =>
                lucid.utxosAt(accountAddress)
            );
            const subscriberAddress: Address = yield* Effect.promise(() =>
                lucid.wallet().address()
            );

            const subscriberUTxOs = yield* Effect.promise(() =>
                lucid.utxosAt(subscriberAddress)
            );

            // let { userNft, refNft } = extractTokens(
            //     accountUTxOs,
            //     subscriberUTxOs,
            // );

            // userNft = createAccountResult.outputs.userNft;
            // refNft = createAccountResult.outputs.refNft;

            removeAccountConfig = {
                // ...createAccountResult.accountConfig,
                // user_token: userNft,
                // ref_token: refNft,
                scripts: accountScript,
            };
        } else {
            const accountAddress = validatorToAddress(
                "Preprod",
                accountValidator.mintAccount,
            );

            const accountUTxOs = yield* Effect.promise(() =>
                lucid.utxosAt(accountAddress)
            );
            const subscriberAddress: Address = yield* Effect.promise(() =>
                lucid.wallet().address()
            );

            const subscriberUTxOs = yield* Effect.promise(() =>
                lucid.utxosAt(subscriberAddress)
            );

            console.log("Address: ", subscriberAddress);
            console.log("subscriberUTxOs: ", subscriberUTxOs);
            console.log("Account Address: ", accountAddress);
            console.log("AccountUTxOs: ", accountUTxOs);

            // const accountData = yield* Effect.promise(
            //     () => (getValidatorDatum(accountUTxOs)),
            // );

            // email: accountData[0].email,
            // phone: accountData[0].phone,
            // account_created: accountData[0].account_created,

            removeAccountConfig = {
                // user_token: userNft,
                // ref_token: refNft,
                scripts: accountScript,
            };
        }

        // console.log("Address: ", subscriberAddress);
        // console.log("subscriberUTxOs: ", subscriberUTxOs);
        // console.log("userNft: ", userNft);
        // console.log("refNft: ", refNft);
        // console.log("removeAccountConfig: ", removeAccountConfig);
        // console.log("Account Address: ", validators.mintValAddress);

        const removeAccountFlow = Effect.gen(function* (_) {
            const removeAccountResult = yield* removeAccount(
                lucid,
                removeAccountConfig,
            );
            const removeAccountSigned = yield* Effect.promise(() =>
                removeAccountResult.sign
                    .withWallet()
                    .complete()
            );

            // console.log("CBOR: ", removeAccountResult.toCBOR());
            const removeAccountHash = yield* Effect.promise(() =>
                removeAccountSigned.submit()
            );

            return removeAccountHash;
        });

        const removeAccountResult = yield* removeAccountFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error creating Account: ${error}`)
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );

        return {
            txHash: removeAccountResult,
        };
    });
};

test("Test 1 - Remove Account", async () => {
    const program = Effect.gen(function* () {
        const context = yield* (makeLucidContext("Preprod"));
        const result = yield* removeAccountTestCase(context);
        return result;
    });
    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
});
