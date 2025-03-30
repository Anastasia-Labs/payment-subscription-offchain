import {
    Data,
    getAddressDetails,
    LucidEvolution,
    TransactionError,
    TxSignBuilder,
} from "@lucid-evolution/lucid"
import { DeployRefScriptsConfig } from "../core/types.js"
import { getMultiValidator } from "../core/index.js"
import { Effect } from "effect"
import { alwaysFailScript } from "../core/validators/constants.js"

export const deployRefScriptsProgram = (
    lucid: LucidEvolution,
    config: DeployRefScriptsConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () {
        const alwaysFailsVal = getMultiValidator(lucid, alwaysFailScript)

        const network = lucid.config().network
        if (!network) {
            throw Error("Network not defined")
        }
        const providerAddress = yield* Effect.promise(() => lucid.wallet().address())
        const walletUtxos = yield* Effect.promise(() => lucid.utxosAt(providerAddress))

        if (!walletUtxos.length) {
            console.error("No UTxO found at user address: " + providerAddress)
        }

        const deployKey = getAddressDetails(providerAddress)
            .paymentCredential?.hash

        if (!deployKey) {
            throw new Error("Missing PubKeyHash")
        }

        const tx = yield* lucid
            .newTx()
            .pay.ToAddressWithData(
                alwaysFailsVal.spendValAddress,
                { kind: "inline", value: Data.void() },
                undefined,
                config.script,
            )
            .completeProgram()

        return tx
    })
