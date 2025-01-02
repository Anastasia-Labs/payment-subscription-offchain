#!/usr/bin/env node
import { Command } from "commander";
import dotenv from "dotenv";
import {
    accountValidator,
    Address,
    Lucid,
    Maestro,
    serviceValidator,
    validatorToAddress,
} from "@anastasia-labs/payment-subscription-offchain";
import { runCreateService } from "./create_service.js";
import { runUpdateService } from "./update_service.js";
import { runRemoveService } from "./remove_service.js";
import { runCreateAccount } from "./create_account.js";
import { runUpdateAccount } from "./update_account.js";
import { runRemoveAccount } from "./remove_account.js";
// import { runSign } from "./validate_sign.js";
// import { runUpdate } from "./validate_update.js";
// import { runEnd } from "./end_multi_sig.js";

// Load environment variables
dotenv.config();

const program = new Command();

program
    .name("subscription-cli")
    .description("CLI for managing payment subscription operations")
    .version("1.0.0");

program
    .command("subscription [action]")
    .description("Manage payment subscription operations")
    .action(async (action) => {
        try {
            const API_KEY = process.env.API_KEY!;
            const SUBSCRIBER_WALLET_SEED = process.env.SUBSCRIBER_WALLET_SEED!;
            const MERCHANT_WALLET_SEED = process.env.MERCHANT_WALLET_SEED!;

            if (!API_KEY) {
                throw new Error("Missing required API_KEY.");
            }

            // Create Lucid instance (remove top-level await)
            const lucid = await Lucid(
                new Maestro({
                    network: "Preprod",
                    apiKey: API_KEY,
                    turboSubmit: false,
                }),
                "Preprod",
            );

            const network = lucid.config().network;
            if (!network) {
                throw Error("Invalid Network selection");
            }

            const serviceAddress = validatorToAddress(
                network,
                serviceValidator.spendService,
            );

            const accountAddress = validatorToAddress(
                network,
                accountValidator.spendAccount,
            );

            if (!SUBSCRIBER_WALLET_SEED || !MERCHANT_WALLET_SEED) {
                throw new Error("Missing required environment variables.");
            }

            switch (action) {
                case "create_service":
                    console.log("create service called");
                    await runCreateService(
                        lucid,
                        MERCHANT_WALLET_SEED,
                    );
                    break;
                case "update_service":
                    console.log("update service called");
                    await runUpdateService(
                        lucid,
                        serviceAddress,
                        MERCHANT_WALLET_SEED,
                    );
                    break;
                case "remove_service":
                    console.log("remove service called");
                    await runRemoveService(
                        lucid,
                        MERCHANT_WALLET_SEED,
                    );
                    break;
                case "create_account":
                    console.log("create account called");
                    await runCreateAccount(
                        lucid,
                        SUBSCRIBER_WALLET_SEED,
                    );
                    break;
                case "update_account":
                    console.log("update account called");
                    lucid.selectWallet.fromSeed(SUBSCRIBER_WALLET_SEED);
                    const subscriberAddress: Address = await lucid.wallet()
                        .address();

                    await runUpdateAccount(
                        lucid,
                        accountAddress,
                        subscriberAddress,
                    );
                    break;
                // case "remove_account":
                //     console.log("remove account called");
                //     await runRemoveAccount(
                //         lucid,
                //         MERCHANT_WALLET_SEED,
                //     );
                //     break;
                // case "update":
                //     await runUpdate(
                //         lucid,
                //         INITIATOR_SEED,
                //         SIGNER_ONE_SEED,
                //         SIGNER_TWO_SEED,
                //         SIGNER_THREE_SEED,
                //     );
                //     break;
                // case "end":
                //     await runEnd(
                //         lucid,
                //         INITIATOR_SEED,
                //         SIGNER_ONE_SEED,
                //         SIGNER_TWO_SEED,
                //         SIGNER_THREE_SEED,
                //         RECIPIENT_SEED,
                //     );
                //     break;
                default:
                    console.log(`Unknown action: ${action}`);
            }

            process.exit(0);
        } catch (error) {
            console.error("Error:", error);
            process.exit(1);
        }
    });

program.parse();
