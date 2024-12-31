#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./init_multi_sig.js";
import dotenv from "dotenv";
import { Lucid, Maestro } from "@anastasia-labs/aiken-multisig-offchain";
import { runSign } from "./validate_sign.js";
import { runUpdate } from "./validate_update.js";
import { runEnd } from "./end_multi_sig.js";

// Load environment variables
dotenv.config();

const program = new Command();

program
    .name("multisig-cli")
    .description("CLI for managing multisig operations")
    .version("1.0.0");

program
    .command("multisig [action]")
    .description("Manage multisig operations")
    .action(async (action) => {
        try {
            const API_KEY = process.env.API_KEY!;
            const INITIATOR_SEED = process.env.INITIATOR_SEED!;
            const SIGNER_ONE_SEED = process.env.SIGNER_ONE_SEED!;
            const SIGNER_TWO_SEED = process.env.SIGNER_TWO_SEED!;
            const SIGNER_THREE_SEED = process.env.SIGNER_THREE_SEED!;
            const RECIPIENT_SEED = process.env.RECIPIENT_SEED!;

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
            switch (action) {
                case "init":
                    await runInit(
                        lucid,
                        INITIATOR_SEED,
                        SIGNER_ONE_SEED,
                        SIGNER_TWO_SEED,
                        SIGNER_THREE_SEED,
                    );
                    break;
                case "sign":
                    await runSign(
                        lucid,
                        INITIATOR_SEED,
                        SIGNER_ONE_SEED,
                        SIGNER_TWO_SEED,
                        SIGNER_THREE_SEED,
                        RECIPIENT_SEED,
                    );
                    break;
                case "update":
                    await runUpdate(
                        lucid,
                        INITIATOR_SEED,
                        SIGNER_ONE_SEED,
                        SIGNER_TWO_SEED,
                        SIGNER_THREE_SEED,
                    );
                    break;
                case "end":
                    await runEnd(
                        lucid,
                        INITIATOR_SEED,
                        SIGNER_ONE_SEED,
                        SIGNER_TWO_SEED,
                        SIGNER_THREE_SEED,
                        RECIPIENT_SEED,
                    );
                    break;
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
