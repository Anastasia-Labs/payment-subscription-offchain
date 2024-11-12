import {
    Address,
    Data,
    fromText,
    getAddressDetails,
    LucidEvolution,
    mintingPolicyToId,
    Script,
    scriptFromNative,
    SpendingValidator,
    toUnit,
    TransactionError,
    TxSignBuilder,
    unixTimeToSlot,
    validatorToAddress,
} from "@lucid-evolution/lucid";
import { Deploy, DeployRefScriptsConfig, Result } from "../core/types.js";
import { getMultiValidator } from "../core/index.js";
import { Effect } from "effect";

export const deployRefScripts = (
    lucid: LucidEvolution,
    config: DeployRefScriptsConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () {
        const alwaysFailsVal = getMultiValidator(lucid, config.alwaysFails);
        const validators = getMultiValidator(lucid, config.scripts);
        const network = lucid.config().network;
        const providerAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const walletUtxos = yield* Effect.promise(() =>
            lucid.utxosAt(providerAddress)
        );

        if (!walletUtxos.length) {
            console.error(
                "No UTxO found at user address: " + providerAddress,
            );
        }

        const providerUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(providerAddress)
        );

        const alwaysFailsUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(alwaysFailsVal.spendValAddress)
        );
        console.log("Address: ", providerAddress);
        console.log("providerUTxOs: ", providerUTxOs);
        console.log("AlwaysFails Address: ", alwaysFailsVal.spendValAddress);
        console.log("AlwaysFailsUTxOs: ", alwaysFailsUTxOs);

        const deployKey = getAddressDetails(providerAddress)
            .paymentCredential?.hash;

        if (!deployKey) {
            throw new Error("Missing PubKeyHash");
        }

        const deployPolicy = scriptFromNative({
            type: "all",
            scripts: [
                { type: "sig", keyHash: deployKey },
                {
                    type: "before",
                    // 30 minutes interval to create all Reference Script UTxOs
                    slot: unixTimeToSlot(
                        network,
                        Number(config.currentTime) + 30 * 60 * 1000,
                    ),
                },
            ],
        });

        const deployPolicyId = mintingPolicyToId(deployPolicy);
        const tokenUnit = toUnit(deployPolicyId, fromText(config.tknName));

        const tx = yield* lucid
            .newTx()
            .attach.MintingPolicy(deployPolicy)
            .mintAssets({
                [tokenUnit]: 1n,
            })
            .pay.ToAddressWithData(
                alwaysFailsVal.spendValAddress,
                { kind: "inline", value: Data.void() },
                { [tokenUnit]: 1n },
                alwaysFailsVal.spendValidator,
            )
            .validTo(Number(config.currentTime) + 29 * 60 * 1000)
            .completeProgram();

        return tx;
    });
