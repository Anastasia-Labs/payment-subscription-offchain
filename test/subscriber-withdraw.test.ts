import {
    Emulator,
    generateEmulatorAccount,
    Lucid,
    LucidEvolution,
    subscriberWithdraw,
    SubscriberWithdrawConfig,
    toUnit,
    UpdateServiceConfig,
    updateServiceDatum,
} from "../src/index.js";
import { beforeEach, expect, test } from "vitest";
import {
    mintingPolicyToId,
    PROTOCOL_PARAMETERS_DEFAULT,
    validatorToAddress,
} from "@lucid-evolution/lucid";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import { tokenNameFromUTxO } from "../src/core/utils/assets.js";
import { initiateSubscriptionTestCase } from "./initiate-subscription.test.js";

type LucidContext = {
    lucid: LucidEvolution;
    users: any;
    emulator: Emulator;
};

// INITIALIZE EMULATOR + ACCOUNTS
beforeEach<LucidContext>(async (context) => {
    context.users = {
        subscriber: generateEmulatorAccount({
            lovelace: BigInt(1000_000_000),
        }),
        merchant: generateEmulatorAccount({
            lovelace: BigInt(1000_000_000),
        }),
    };

    context.emulator = new Emulator([
        context.users.subscriber,
        context.users.merchant,
    ], { ...PROTOCOL_PARAMETERS_DEFAULT, maxTxSize: 20000 });

    context.lucid = await Lucid(context.emulator, "Custom");
});

test<LucidContext>("Test 1 - Subscriber Withdraw", async (
    { lucid, users, emulator }: LucidContext,
) => {
    const program = Effect.gen(function* () {
        const initResult = yield* initiateSubscriptionTestCase({
            lucid,
            users,
            emulator,
        });

        expect(initResult).toBeDefined();
        expect(typeof initResult.txHash).toBe("string"); // Assuming the initResult is a transaction hash
        console.log(
            "Subscription initiated with transaction hash:",
            initResult.txHash,
        );

        yield* Effect.sync(() => emulator.awaitBlock(100));

        const serviceValidator = readMultiValidators(false, []);

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);

        const serviceScript = {
            spending: serviceValidator.spendService.script,
            minting: serviceValidator.mintService.script,
            staking: "",
        };

        const updateServiceConfig: UpdateServiceConfig = {
            new_service_fee: initResult.paymentConfig.subscription_fee,
            new_service_fee_qty: initResult.paymentConfig.interval_amount,
            new_penalty_fee: initResult.paymentConfig.penalty_fee,
            new_penalty_fee_qty: initResult.paymentConfig.penalty_fee_qty,
            new_interval_length: initResult.paymentConfig.interval_length,
            new_num_intervals: initResult.paymentConfig.num_intervals,
            new_minimum_ada: initResult.paymentConfig.minimum_ada,
            is_active: false,
            user_token: initResult.outputs.accUsrNft,
            ref_token: initResult.outputs.servcRefNft,
            scripts: serviceScript,
        };

        console.log(
            "updateServiceConfig:",
            updateServiceConfig,
        );

        const updateServiceResult = yield* updateServiceDatum(
            lucid,
            updateServiceConfig,
        );
        const updateServiceSigned = yield* Effect.promise(() =>
            updateServiceResult.sign.withWallet().complete()
        );

        const updateServiceTxHash = yield* Effect.promise(() =>
            updateServiceSigned.submit()
        );

        console.log(
            "Service updated with transaction hash:",
            updateServiceTxHash,
        );

        yield* Effect.sync(() => emulator.awaitBlock(100));

        const serviceScriptAddress = validatorToAddress(
            "Custom",
            serviceValidator.spendService,
        );

        const serviceScriptUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(serviceScriptAddress)
        );

        console.log("Updated Service Validator: UTxOs", serviceScriptUTxOs);

        const paymentValidator = readMultiValidators(true, [
            initResult.paymentConfig.service_policyId,
            initResult.paymentConfig.account_policyId,
        ]);

        const paymentScript = {
            spending: paymentValidator.spendPayment.script,
            minting: paymentValidator.mintPayment.script,
            staking: "",
        };

        const paymentPolicyId = mintingPolicyToId(
            paymentValidator.mintPayment,
        );

        const payment_token_name = tokenNameFromUTxO(
            initResult.outputs.paymentValidatorUTxOs,
            paymentPolicyId,
        );

        const paymentNFT = toUnit(
            paymentPolicyId,
            payment_token_name, //tokenNameWithoutFunc,
        );

        const extension_intervals = BigInt(1); // Number of intervals to extend
        const interval_amount = initResult.paymentConfig.interval_amount *
            extension_intervals;
        const newTotalSubscriptionFee =
            initResult.paymentConfig.total_subscription_fee +
            (interval_amount * extension_intervals);
        const newNumIntervals = initResult.paymentConfig.num_intervals +
            extension_intervals;
        const extension_period = initResult.paymentConfig.interval_length *
            extension_intervals;

        const newSubscriptionEnd = initResult.paymentConfig.subscription_end +
            extension_period;

        // Calculate new subscription end time
        const currentTime = BigInt(emulator.now());

        lucid.selectWallet.fromSeed(users.subscriber.seedPhrase);
        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(users.subscriber.address)
        );

        const subscriberWithdrawConfig: SubscriberWithdrawConfig = {
            ...initResult.paymentConfig,
            subscription_start: currentTime,
            subscription_end: newSubscriptionEnd,
            total_subscription_fee: newTotalSubscriptionFee,
            num_intervals: newNumIntervals,
            last_claimed: currentTime,
            interval_length: initResult.paymentConfig.interval_length,
            interval_amount: interval_amount,
            subscriber_token: initResult.outputs.accUsrNft,
            service_ref_token: initResult.outputs.servcRefNft,
            payment_token: paymentNFT,
            scripts: paymentScript,
            subscriberUTxO: subscriberUTxOs,
            serviceUTxO: serviceScriptUTxOs,
            paymentUTxO: initResult.outputs.paymentValidatorUTxOs,
        };

        console.log(
            "SubscriberWithdrawConfig:",
            subscriberWithdrawConfig,
        );

        const subscriberWithdrawResult = yield* subscriberWithdraw(
            lucid,
            subscriberWithdrawConfig,
        );
        const subscriberWithdrawSigned = yield* Effect.promise(() =>
            subscriberWithdrawResult.sign.withWallet().complete()
        );

        const subscriberWithdrawTxHash = yield* Effect.promise(() =>
            subscriberWithdrawSigned.submit()
        );

        console.log(
            "subscriber withdraws with transaction hash:",
            subscriberWithdrawTxHash,
        );
        yield* Effect.sync(() => emulator.awaitBlock(100));

        const subscriberUTxO = yield* Effect.promise(() =>
            lucid.utxosAt(users.subscriber.address)
        );

        yield* Effect.log("subscriberUTxO: After:", subscriberUTxO);

        return {
            initTxHash: initResult.txHash,
            subscriberWithdrawTxHash,
            withdrawConfig: subscriberWithdrawConfig,
        };
    });
    const result = await Effect.runPromise(program);

    expect(result.initTxHash).toBeDefined();
    expect(result.subscriberWithdrawTxHash).toBeDefined();
    expect(typeof result.initTxHash).toBe("string");
    expect(typeof result.subscriberWithdrawTxHash).toBe("string");

    // Add assertions to verify the extended configuration
    expect(result.withdrawConfig.subscription_end).toBeGreaterThan(
        result.withdrawConfig.subscription_start,
    );
    expect(result.withdrawConfig.total_subscription_fee).toBe(
        result.withdrawConfig.interval_amount *
            result.withdrawConfig.num_intervals,
    );
    expect(result.withdrawConfig.num_intervals).toBe(13n);
});
