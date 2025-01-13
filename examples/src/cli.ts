#!/usr/bin/env node
import { Command } from "commander";
import dotenv from "dotenv";
import { Address } from "@anastasia-labs/payment-subscription-offchain";

import { runCreateService } from "./create_service.js";
import { runUpdateService } from "./update_service.js";
import { runRemoveService } from "./remove_service.js";
import { runCreateAccount } from "./create_account.js";
import { runUpdateAccount } from "./update_account.js";
import { runRemoveAccount } from "./remove_account.js";
import { runInitSubscription } from "./init_subscription.js";
import { runExtendSubscription } from "./extend_subscription.js"; // if you have one
import { setupLucid } from "./setup.js";
import { runMerchantWithdraw } from "./merchant_withdraw.js";
import { runUnsubscribe } from "./unsubscribe.js";
import { runWithdrawPenalty } from "./withdraw_penalty.js";
import { runSubscriberWithdraw } from "./subscriber_withdraw.js";

dotenv.config();

const program = new Command();

program
    .name("subscription-cli")
    .description("CLI for managing payment subscription operations")
    .version("1.0.0");

/* ------------------------------------------------------------------
   Service Subcommands
   Usage: pnpm start service <create|update|remove>
-------------------------------------------------------------------*/
const serviceCommand = program.command("service").description(
    "Service-related commands",
);

serviceCommand.command("create").action(async () => {
    try {
        const { lucid, MERCHANT_WALLET_SEED } = await setupLucid();

        lucid.selectWallet.fromSeed(MERCHANT_WALLET_SEED);

        await runCreateService(lucid);
        process.exit(0);
    } catch (error) {
        console.error("Error creating service:", error);
        process.exit(1);
    }
});

serviceCommand.command("update").action(async () => {
    try {
        const { lucid, MERCHANT_WALLET_SEED, serviceAddress } =
            await setupLucid();
        await runUpdateService(lucid, serviceAddress, MERCHANT_WALLET_SEED);
        process.exit(0);
    } catch (error) {
        console.error("Error updating service:", error);
        process.exit(1);
    }
});

serviceCommand.command("remove").action(async () => {
    try {
        const { lucid, MERCHANT_WALLET_SEED, serviceAddress } =
            await setupLucid();

        lucid.selectWallet.fromSeed(MERCHANT_WALLET_SEED);

        await runRemoveService(lucid);
        process.exit(0);
    } catch (error) {
        console.error("Error removing service:", error);
        process.exit(1);
    }
});

/* ------------------------------------------------------------------
   Account Subcommands
   Usage: pnpm start account <create|update|remove>
-------------------------------------------------------------------*/
const accountCommand = program.command("account").description(
    "Account-related commands",
);

accountCommand.command("create").action(async () => {
    try {
        const { lucid, SUBSCRIBER_WALLET_SEED } = await setupLucid();
        // Usually select the wallet first if needed
        lucid.selectWallet.fromSeed(SUBSCRIBER_WALLET_SEED);

        await runCreateAccount(lucid);
        process.exit(0);
    } catch (error) {
        console.error("Error creating account:", error);
        process.exit(1);
    }
});

accountCommand.command("update").action(async () => {
    try {
        const { lucid, SUBSCRIBER_WALLET_SEED, accountAddress } =
            await setupLucid();
        lucid.selectWallet.fromSeed(SUBSCRIBER_WALLET_SEED);

        await runUpdateAccount(lucid);
        process.exit(0);
    } catch (error) {
        console.error("Error updating account:", error);
        process.exit(1);
    }
});

accountCommand.command("remove").action(async () => {
    try {
        const { lucid, SUBSCRIBER_WALLET_SEED, accountAddress } =
            await setupLucid();
        lucid.selectWallet.fromSeed(SUBSCRIBER_WALLET_SEED);
        const subscriberAddress: Address = await lucid.wallet().address();

        await runRemoveAccount(lucid, accountAddress, subscriberAddress);
        process.exit(0);
    } catch (error) {
        console.error("Error removing account:", error);
        process.exit(1);
    }
});

/* ------------------------------------------------------------------
   Payment Subcommands
   Usage: pnpm start payment <init_subscription|extend_subscription|...>
-------------------------------------------------------------------*/
const paymentCommand = program.command("payment").description(
    "Payment-related commands",
);

paymentCommand.command("init").action(async () => {
    try {
        const {
            lucid,
            SUBSCRIBER_WALLET_SEED,
        } = await setupLucid();

        // 1. Subscriber selects wallet, get subscriber address
        lucid.selectWallet.fromSeed(SUBSCRIBER_WALLET_SEED);

        // 2. Call your init_subscription logic
        await runInitSubscription(
            lucid,
        );
        process.exit(0);
    } catch (error) {
        console.error("Error initiating subscription:", error);
        process.exit(1);
    }
});

paymentCommand.command("extend").action(async () => {
    try {
        const {
            lucid,
            SUBSCRIBER_WALLET_SEED,
        } = await setupLucid();

        lucid.selectWallet.fromSeed(SUBSCRIBER_WALLET_SEED);

        await runExtendSubscription(
            lucid,
        );
        process.exit(0);
    } catch (error) {
        console.error("Error extending subscription:", error);
        process.exit(1);
    }
});

paymentCommand.command("merchant_withdraw").action(async () => {
    try {
        const {
            lucid,
            MERCHANT_WALLET_SEED,
        } = await setupLucid();

        lucid.selectWallet.fromSeed(MERCHANT_WALLET_SEED);

        await runMerchantWithdraw(
            lucid,
        );
        process.exit(0);
    } catch (error) {
        console.error("Error extending subscription:", error);
        process.exit(1);
    }
});

paymentCommand.command("unsubscribe").action(async () => {
    try {
        const {
            lucid,
            SUBSCRIBER_WALLET_SEED,
        } = await setupLucid();

        lucid.selectWallet.fromSeed(SUBSCRIBER_WALLET_SEED);

        await runUnsubscribe(
            lucid,
        );
        process.exit(0);
    } catch (error) {
        console.error("Error extending subscription:", error);
        process.exit(1);
    }
});

paymentCommand.command("withdraw_penalty").action(async () => {
    try {
        const {
            lucid,
            MERCHANT_WALLET_SEED,
        } = await setupLucid();

        lucid.selectWallet.fromSeed(MERCHANT_WALLET_SEED);

        await runWithdrawPenalty(
            lucid,
        );
        process.exit(0);
    } catch (error) {
        console.error("Error extending subscription:", error);
        process.exit(1);
    }
});

paymentCommand.command("subscriber_withdraw").action(async () => {
    try {
        const {
            lucid,
            MERCHANT_WALLET_SEED,
            SUBSCRIBER_WALLET_SEED,
            serviceAddress,
            accountAddress,
        } = await setupLucid();

        console.log("subscriber_withdraw called");

        lucid.selectWallet.fromSeed(MERCHANT_WALLET_SEED);
        const merchantAddress: Address = await lucid.wallet().address();

        lucid.selectWallet.fromSeed(SUBSCRIBER_WALLET_SEED);
        const subscriberAddress: Address = await lucid.wallet().address();

        await runSubscriberWithdraw(
            lucid,
            serviceAddress,
            merchantAddress,
            accountAddress,
            subscriberAddress,
        );
        process.exit(0);
    } catch (error) {
        console.error("Error extending subscription:", error);
        process.exit(1);
    }
});

// Parse CLI
program.parse();
