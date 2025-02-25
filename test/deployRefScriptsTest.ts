import {
    DeployRefScriptsConfig,
    deployRefScriptsProgram,
    getMultiValidator,
} from "../src/index.js"
import { Effect } from "effect"
import { LucidContext } from "./service/lucidContext.js"
import { accountScript } from "../src/core/validators/constants.js"

export type DeployRefScriptsResult = {
    txHash: string
    deployConfig: DeployRefScriptsConfig
}

export type ValidatorName = "spendService" | "spendAccount" | "spendPayment"

export const deployRefScriptTest = (
    { lucid, users, emulator }: LucidContext,
): Effect.Effect<DeployRefScriptsResult, Error, never> => {
    return Effect.gen(function* () {
        lucid.selectWallet.fromSeed(users.dappProvider.seedPhrase)
        const validators = getMultiValidator(lucid, accountScript)
        const deployConfig: DeployRefScriptsConfig = {
            script: validators.spendValidator
        }
        const network = lucid.config().network
        if (!network) {
            throw Error("Invalid Network selection")
        }

        const deployRefScriptsFlow = Effect.gen(function* (_) {
            const deployRefScriptsResult = yield* deployRefScriptsProgram(lucid, deployConfig)
            const deployRefScriptsSigned = yield* Effect.promise(() =>
                deployRefScriptsResult.sign.withWallet().complete()
            )
            const deployRefScriptsHash = yield* Effect.promise(() =>
                deployRefScriptsSigned.submit()
            )
            return deployRefScriptsHash
        })

        const deployRefScriptsResult = yield* deployRefScriptsFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error deploying validator: ${error}`)
            ),
            Effect.map((hash) => {
                return hash
            }),
        )
        if (emulator) {
            yield* Effect.sync(() => emulator.awaitBlock(20))
        }

        return { txHash: deployRefScriptsResult, deployConfig }
    })
}
