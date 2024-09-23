import {
    createAccount,
    CreateAccountConfig,
    Emulator,
    generateEmulatorAccount,
    Lucid,
    LucidEvolution,
    toUnit,
    updateAccount,
    UpdateAccountConfig,
} from "../src/index.js";
import { beforeEach, test } from "vitest";
import { mintingPolicyToId, validatorToAddress } from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
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
    console.log("Subscriber Address: Before :: ", users.subscriber.address);
    console.log("Subscriber UTxOs: Before :: ", subscriberUTxO);

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
    console.log("Subscriber Address: After :: ", users.subscriber.address);
    console.log("Subscriber UTxOs: After :: ", subscriberUTxOAfter);

    const accountScriptAddress = validatorToAddress(
        "Custom",
        accountValidator.spendAccount,
    );
    console.log("Validator utxos", await lucid.utxosAt(accountScriptAddress));
    const accountUTxO = await lucid.utxosAt(accountScriptAddress);

    emulator.awaitBlock(100);
    console.log(
        "UPDATING///////////////////////////>>>>>>>>>>>>>>>>>>",
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

    const updateAccountConfig: UpdateAccountConfig = {
        new_email: "new_business@web3.ada",
        new_phone: "(288) 481-2686",
        account_created: createAccountConfig.account_created,
        user_token: userNft,
        ref_token: refNft,
        scripts: accountScript,
    };

    lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

    try {
        const updateAccountResult = await Effect.runPromise(
            updateAccount(lucid, updateAccountConfig),
        );
        const updateAccountSigned = await updateAccountResult.sign.withWallet()
            .complete();
        const updateAccountHash = await updateAccountSigned.submit();
        console.log("TxHash: ", updateAccountHash);
    } catch (error) {
        console.error("Error updating service:", error);
        throw error; // or handle it as appropriate for your test
    }
    emulator.awaitBlock(100);

    const subscriberUTxOs = await lucid.utxosAt(users.subscriber.address);
    console.log("Updated Subscriber UTxOs: After:", subscriberUTxOs);

    const scriptUTxOs = await lucid.utxosAt(accountScriptAddress);

    console.log("Updated Service Validator: UTxOs", scriptUTxOs);

    emulator.awaitBlock(100);
});
