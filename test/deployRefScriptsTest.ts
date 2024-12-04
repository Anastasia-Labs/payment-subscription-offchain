import {
    deployRefScripts,
    DeployRefScriptsConfig,
    REF_SCRIPT_TOKEN_NAMES,
    validatorToAddress,
} from "../src/index.js";
import { readMultiValidators, Validators } from "./compiled/validators.js";
import { Effect } from "effect";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext, NETWORK } from "./service/lucidContext.js";

const validators = readMultiValidators(blueprint, false, []);

export type DeployRefScriptsResult = {
    txHash: string;
    deployConfig: DeployRefScriptsConfig;
};

export type ValidatorName = "spendService" | "spendAccount" | "spendPayment";

export const deployRefScriptTest = (
    { lucid, users, emulator }: LucidContext,
    validatorTag: ValidatorName,
): Effect.Effect<DeployRefScriptsResult, Error, never> => {
    return Effect.gen(function* () {
        lucid.selectWallet.fromSeed(users.dappProvider.seedPhrase);

        let currentTime: bigint;

        if (emulator) {
            currentTime = BigInt(emulator.now());
        } else {
            currentTime = BigInt(Date.now());
        }

        const validatorKey: keyof Validators = validatorTag; // or "mintPayment" if you want the minting policy
        const tokenName: string = REF_SCRIPT_TOKEN_NAMES[validatorKey];

        const deployingScript = {
            spending: validators.spendPayment.script,
            minting: validators.mintPayment.script,
            staking: "",
        };

        const alwaysFailScript = {
            spending: validators.alwaysFails.script,
            minting: "",
            staking: "",
        };

        const deployConfig: DeployRefScriptsConfig = {
            tknName: tokenName,
            scripts: deployingScript,
            alwaysFails: alwaysFailScript,
            currentTime,
        };

        const alwaysFailsaddress = validatorToAddress(
            NETWORK,
            validators.alwaysFails,
        );

        const alwaysFailsUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(alwaysFailsaddress)
        );

        const deployRefScriptsFlow = Effect.gen(function* (_) {
            const deployRefScriptsResult = yield* deployRefScripts(
                lucid,
                deployConfig,
            );
            const deployRefScriptsSigned = yield* Effect.promise(() =>
                deployRefScriptsResult.sign.withWallet().complete()
            );
            const deployRefScriptsHash = yield* Effect.promise(() =>
                deployRefScriptsSigned.submit()
            );
            if (emulator) {
                yield* Effect.promise(() =>
                    emulator.awaitTx(deployRefScriptsHash)
                );
            } else {
                yield* Effect.promise(() =>
                    lucid.awaitTx(deployRefScriptsHash)
                );
            }
            return deployRefScriptsHash;
        });

        const deployRefScriptsResult = yield* deployRefScriptsFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(
                    `Error deploying validator ${validatorKey}: ${error}`,
                )
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );
        if (emulator) {
            yield* Effect.sync(() => emulator.awaitBlock(20));
        }

        return { txHash: deployRefScriptsResult, deployConfig };
    });
};

export const deployMultipleValidators = (
    context: LucidContext,
    validatorTags: ValidatorName[],
): Effect.Effect<DeployRefScriptsResult[], Error, never> => {
    return Effect.gen(function* () {
        const results: DeployRefScriptsResult[] = [];

        for (const tag of validatorTags) {
            const result = yield* deployRefScriptTest(context, tag);
            results.push(result);

            // Add delay between deployments if not in emulator
            if (!context.emulator) {
                yield* Effect.promise(() =>
                    new Promise((resolve) => setTimeout(resolve, 5000))
                );
            }
        }

        return results;
    });
};
