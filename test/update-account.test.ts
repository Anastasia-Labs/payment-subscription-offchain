import {
    Emulator,
    generateEmulatorAccount,
    Lucid,
    LucidEvolution,
    toUnit,
    updateAccount,
    UpdateAccountConfig,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import { mintingPolicyToId, validatorToAddress } from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { findCip68TokenNames } from "../src/core/utils/assets.js";
import { createAccountTestCase } from "./create-account.test.js";
import blueprint from "./compiled/plutus.json" assert { type: "json" };

type LucidContext = {
    lucid: LucidEvolution;
    users: any;
    emulator: Emulator;
};

const accountValidator = readMultiValidators(blueprint, false, []);
const accountPolicyId = mintingPolicyToId(accountValidator.mintAccount);

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
    context.users = {
        subscriber: generateEmulatorAccount({
            lovelace: BigInt(100_000_000),
        }),
    };

    context.emulator = new Emulator([
        context.users.subscriber,
    ]);

    context.lucid = await Lucid(context.emulator, "Custom");
});

test<LucidContext>("Test 1 - Update Account", async ({
    lucid,
    users,
    emulator,
}) => {
    const program = Effect.gen(function* () {
        const createAccountResult = yield* createAccountTestCase({
            lucid,
            users,
            emulator,
        });

        expect(createAccountResult).toBeDefined();
        expect(typeof createAccountResult.txHash).toBe("string"); // Assuming the createAccountResult is a transaction hash

        yield* Effect.sync(() => emulator.awaitBlock(100));

        const subscriberUTxOAfter = yield* Effect.promise(() =>
            lucid.utxosAt(
                users.subscriber.address,
            )
        );

        const accountScriptAddress = validatorToAddress(
            "Custom",
            accountValidator.spendAccount,
        );

        const accountUTxO = yield* Effect.promise(() =>
            lucid.utxosAt(accountScriptAddress)
        );

        yield* Effect.sync(() => emulator.awaitBlock(100));

        const cip68TokenNames = findCip68TokenNames(
            [...accountUTxO, ...subscriberUTxOAfter],
            accountPolicyId,
        );
        const { refTokenName, userTokenName } = cip68TokenNames;

        const refNft = toUnit(
            accountPolicyId,
            refTokenName,
        );

        const userNft = toUnit(
            accountPolicyId,
            userTokenName,
        );

        const updateAccountConfig: UpdateAccountConfig = {
            ...createAccountResult.accountConfig,
            new_email: "new_business@web3.ada",
            new_phone: "(288) 481-2686",
            user_token: userNft,
            ref_token: refNft,
        };

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        const updateAccountResult = yield* Effect.promise(() =>
            Effect.runPromise(
                updateAccount(lucid, updateAccountConfig),
            )
        );
        const updateAccountSigned = yield* Effect.promise(() =>
            updateAccountResult.sign
                .withWallet()
                .complete()
        );
        const updateAccountHash = yield* Effect.promise(() =>
            updateAccountSigned.submit()
        );
    });

    await Effect.runPromise(program);
});
