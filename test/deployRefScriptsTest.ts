import {
    Address,
    deployRefScripts,
    DeployRefScriptsConfig,
    mintingPolicyToId,
    REF_SCRIPT_TOKEN_NAMES,
    toUnit,
    Unit,
    UTxO,
    validatorToAddress,
} from "../src/index.js";
import { readMultiValidators, Validators } from "./compiled/validators.js";
import { Effect } from "effect";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext } from "./service/lucidContext.js";

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
        console.log("tokenName: ", tokenName);

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
        const network = lucid.config().network;

        const alwaysFailsaddress = validatorToAddress(
            network,
            validators.alwaysFails,
        );

        const alwaysFailsUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(alwaysFailsaddress)
        );

        console.log("AlwaysFails Address Start: ", alwaysFailsaddress);
        console.log("alwaysFailsUTxOs Start: ", alwaysFailsUTxOs);

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
        // const subscriberAddress: Address = yield* Effect.promise(() =>
        //     lucid.wallet().address()
        // );
        // const subscriberUTxOs = yield* Effect.promise(() =>
        //     lucid.utxosAt(subscriberAddress)
        // );

        // const network = lucid.config().network;
        // const alwaysFailsaddress = validatorToAddress(
        //     network,
        //     validators.alwaysFails,
        // );

        // const alwaysFailsUTxOs = yield* Effect.promise(() =>
        //     lucid.config().provider.getUtxos(alwaysFailsaddress)
        // );

        // console.log("AlwaysFails Address Done: ", alwaysFailsaddress);
        // console.log("alwaysFailsUTxOs Done: ", alwaysFailsUTxOs);

        if (emulator) {
            yield* Effect.sync(() => emulator.awaitBlock(100));
        }

        return { txHash: deployRefScriptsResult, deployConfig };
    });
};
