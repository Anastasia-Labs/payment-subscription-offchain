import {
    ADA,
    createAccount,
    CreateAccountConfig,
    Emulator,
    generateEmulatorAccount,
    Lucid,
    LucidEvolution,
    removeAccount,
    RemoveAccountConfig,
    sendTokenToAccount,
    sendTokenToService,
    toUnit,
    UpdateAccountConfig,
    UpdateServiceConfig,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import { mintingPolicyToId, validatorToAddress } from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { toText } from "@lucid-evolution/lucid";
import { findCip68TokenNames } from "../src/core/utils/assets.js";

type LucidContext = {
    lucid: LucidEvolution;
    users: any;
    emulator: Emulator;
};

const accountValidator = readMultiValidators();
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

test<LucidContext>("Test 1 - Update Service", async ({
    lucid,
    users,
    emulator,
}) => {
    console.log("Update Subscription Service...TEST!!!!");

    const accountScript = {
        spending: accountValidator.spendAccount.script,
        minting: accountValidator.mintAccount.script,
        staking: "",
    };

    const createAccountConfig: CreateAccountConfig = {
        email: "business@web3.ada",
        phone: "288-481-2686",
        account_created: BigInt(emulator.now()),
        scripts: accountScript,
    };

    lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

    const subscriberUTxO = await lucid.utxosAt(users.subscriber.address);
    console.log("subscriberAddress: ", users.subscriber.address);
    console.log("subscriberUTxOs before transaction: ", subscriberUTxO);

    try {
        const createAccountUnSigned = await Effect.runPromise(
            createAccount(lucid, createAccountConfig),
        );
        const createAccountSigned = await createAccountUnSigned.sign
            .withWallet()
            .complete();
        const createServiceHash = await createAccountSigned.submit();
        console.log("TxHash: ", createServiceHash);
    } catch (error) {
        console.error("Error updating service:", error);
        throw error;
    }
    emulator.awaitBlock(100);

    const subscriberUTxOAfter = await lucid.utxosAt(users.subscriber.address);
    console.log("subscriberAddress: After: ", users.subscriber.address);
    console.log("subscriberUTxO: After:", subscriberUTxOAfter);

    const accountScriptAddress = validatorToAddress(
        "Custom",
        accountValidator.spendAccount,
    );
    console.log("Validator utxos", await lucid.utxosAt(accountScriptAddress));
    const accountUTxO = await lucid.utxosAt(accountScriptAddress);

    emulator.awaitBlock(100);
    console.log(
        "REMOVING///////////////////////////>>>>>>>>>>>>>>>>>>",
        accountUTxO,
    );

    // Find the token names
    const { refTokenName, userTokenName } = findCip68TokenNames([
        ...accountUTxO,
        ...subscriberUTxOAfter,
    ], accountPolicyId);

    const refNft = toUnit(
        accountPolicyId,
        refTokenName,
    );

    const userNft = toUnit(
        accountPolicyId,
        userTokenName,
    );

    const removeAccountConfig: RemoveAccountConfig = {
        email: "business@web3.ada",
        phone: "288 481-2686",
        account_created: createAccountConfig.account_created,
        user_token: userNft,
        ref_token: refNft,
        scripts: accountScript,
    };

    lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

    try {
        const removeAccountResult = await Effect.runPromise(
            removeAccount(lucid, removeAccountConfig),
        );
        const removeAccountSigned = await removeAccountResult.sign.withWallet()
            .complete();
        const removeAccountHash = await removeAccountSigned.submit();
        console.log("TxHash: ", removeAccountHash);
    } catch (error) {
        console.error("Error updating service:", error);
        throw error; // or handle it as appropriate for your test
    }
    emulator.awaitBlock(100);

    const removeSubscriberUTxO = await lucid.utxosAt(users.subscriber.address);
    console.log("removeSubscriberUTxO: After:", removeSubscriberUTxO);

    const scriptUTxOs = await lucid.utxosAt(accountScriptAddress);

    console.log("Updated Service Validator: UTxOs", scriptUTxOs);

    emulator.awaitBlock(100);
});
