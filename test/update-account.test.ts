import {
    ADA,
    CreateAccountConfig,
    Emulator,
    generateEmulatorAccount,
    Lucid,
    LucidEvolution,
    sendTokenToAccount,
    sendTokenToService,
    toUnit,
    updateAccount,
    UpdateAccountConfig,
    UpdateServiceConfig,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import { mintingPolicyToId, validatorToAddress } from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { toText } from "@lucid-evolution/lucid";

type LucidContext = {
    lucid: LucidEvolution;
    users: any;
    emulator: Emulator;
};

const accountValidator = readMultiValidators();
const accountPolicyId = mintingPolicyToId(accountValidator.mintAccount);

const refNft = toUnit(
    accountPolicyId,
    "000643b09e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db7199",
);

const userNft = toUnit(
    accountPolicyId,
    "000de1409e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db7199",
);

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
    context.users = {
        subscriber: generateEmulatorAccount({
            lovelace: BigInt(100_000_000),
            [refNft]: BigInt(1),
            [userNft]: BigInt(1),
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

    const merchantUTxO = await lucid.utxosAt(users.subscriber.address);
    console.log("merchantAddress: ", users.subscriber.address);
    console.log("merchantUTxOs before transaction: ", merchantUTxO);

    const sendTokenUnsigned = await sendTokenToAccount(
        lucid,
        createAccountConfig,
    );

    expect(sendTokenUnsigned.type).toBe("ok");
    if (sendTokenUnsigned.type == "ok") {
        const sendTokenSigned = await sendTokenUnsigned.data.sign
            .withWallet()
            .complete();
        const sendTokenHash = await sendTokenSigned.submit();
        emulator.awaitBlock(100);

        console.log(
            "Merchant utxos",
            await lucid.utxosAt(users.subscriber.address),
        );
    }
    emulator.awaitBlock(100);

    const merchantUTxOAfter = await lucid.utxosAt(users.subscriber.address);
    console.log("merchantAddress: After: ", users.subscriber.address);
    console.log("merchantUTxO: After:", merchantUTxOAfter);

    const accountScriptAddress = validatorToAddress(
        "Custom",
        accountValidator.spendAccount,
    );
    console.log("Validator utxos", await lucid.utxosAt(accountScriptAddress));
    const serviceUTxO = await lucid.utxosAt(accountScriptAddress);

    emulator.awaitBlock(100);
    console.log(
        "UPDATING///////////////////////////>>>>>>>>>>>>>>>>>>",
        serviceUTxO,
    );

    const updateAccountConfig: UpdateAccountConfig = {
        new_email: "new_business@web3.ada",
        new_phone: "(288) 481-2686",
        account_created: createAccountConfig.account_created,
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

    const updatedMerchantUTxO = await lucid.utxosAt(users.subscriber.address);
    console.log("updatedMerchantUTxO: After:", updatedMerchantUTxO);

    const scriptUTxOs = await lucid.utxosAt(accountScriptAddress);

    console.log("Updated Service Validator: UTxOs", scriptUTxOs);

    emulator.awaitBlock(100);
});
