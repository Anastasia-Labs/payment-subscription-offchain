import {
    Installment,
    parseSafeDatum,
    PaymentDatum,
    PaymentValidatorDatum,
    PenaltyDatum,
    ServiceDatum,
    UTxO,
} from "../index.js" // Adjust the import path as necessary
import { Effect } from "effect"
import {
    LucidEvolution,
    PolicyId,
    toUnit,
    TransactionError,
    TxBuilderError,
    Unit,
} from "@lucid-evolution/lucid"
import { findCip68TokenNames } from "../core/utils/assets.js"

// /**
//  * Extracts token units (userNft and refNft) from UTxOs.
//  * @param validatorUTxOs - Array of UTxOs from the validator address.
//  * @param walletUTxOs - Array of UTxOs from the wallet address.
//  * @returns An object containing userNft and refNft.
//  */
export const extractTokens = (
    policyId: PolicyId,
    validatorUTxOs: UTxO[],
    walletUTxOs: UTxO[],
): { user_token: Unit; ref_token: Unit } => {
    let user_token: Unit
    let ref_token: Unit
    if (validatorUTxOs.length > 0 && walletUTxOs.length > 0) {
        const { refTokenName, userTokenName } = findCip68TokenNames(
            validatorUTxOs,
            walletUTxOs,
            policyId,
        )

        ref_token = toUnit(policyId, refTokenName)
        user_token = toUnit(policyId, userTokenName)
        return { user_token, ref_token }
    } else {
        throw new Error("Failed to find both UTxOs")
    }
}

export const getWalletUTxOs = (
    lucid: LucidEvolution,
): Effect.Effect<UTxO[], never> => {
    return Effect.gen(function* ($) {
        const walletAddr: string = yield* $(Effect.promise(() => lucid.wallet().address()))
        const utxos: UTxO[] = yield* $(Effect.promise(() => lucid.utxosAt(walletAddr)))
        return utxos
    })
}

export const logWalletUTxOs = (
    lucid: LucidEvolution,
    msg: string,
): Effect.Effect<UTxO[], never, void> => {
    return Effect.gen(function* ($) {
        const utxos: UTxO[] = yield* $(getWalletUTxOs(lucid))
        yield* $(Effect.sync(() => {
            Effect.log(
                `------------------------- ${msg} -------------------------`,
            )
            Effect.log(utxos)
        }))
        return utxos
    })
}

export const getServiceValidatorDatum = (
    utxoOrUtxos: UTxO | UTxO[],
): ServiceDatum[] => {
    const utxos = Array.isArray(utxoOrUtxos) ? utxoOrUtxos : [utxoOrUtxos]

    return utxos.flatMap((utxo, index) => {
        if (!utxo.datum) {
            console.error(`UTxO ${index} has no datum.`)
            return []
        }

        try {
            const result = parseSafeDatum<ServiceDatum>(utxo.datum, ServiceDatum)
            if (result.type == "right") {
                return [result.value]
            } else {
                console.error(`Failed to parse datum for UTxO ${index}:`, result.type)
                return []
            }
        } catch (error) {
            console.error(`Exception while parsing datum for UTxO ${index}:`, error)
            return []
        }
    })
}

export const getPaymentValidatorDatum = (
    utxoOrUtxos: UTxO | UTxO[],
): PaymentDatum[] => {
    const utxos = Array.isArray(utxoOrUtxos) ? utxoOrUtxos : [utxoOrUtxos]

    return utxos.flatMap((utxo) => {
        const result = parseSafeDatum<PaymentValidatorDatum>(utxo.datum, PaymentValidatorDatum)

        if (result.type == "right") {
            const paymentValidatorDatum = result.value

            if ("Payment" in paymentValidatorDatum) {
                const paymentDatum = paymentValidatorDatum.Payment[0]
                return [paymentDatum]
            } else {
                console.error(`UTxO ${utxo.txHash} contains Penalty datum, skipping.`)
                return []
            }
        } else {
            return []
        }
    })
}

export const getPenaltyDatum = (
    utxoOrUtxos: UTxO | UTxO[],
): PenaltyDatum[] => {
    const utxos = Array.isArray(utxoOrUtxos) ? utxoOrUtxos : [utxoOrUtxos]

    return utxos.flatMap((utxo) => {
        const result = parseSafeDatum<PaymentValidatorDatum>(utxo.datum, PaymentValidatorDatum)

        if (result.type == "right") {
            const paymentValidatorDatum = result.value

            // Check if it's a Payment or Penalty
            if ("Penalty" in paymentValidatorDatum) {
                const penaltyDatum = paymentValidatorDatum.Penalty[0]
                return [penaltyDatum]
            } else {
                console.error(`UTxO ${utxo.txHash} contains Payment datum, skipping.`)
                return []
            }
        } else {
            return []
        }
    })
}

interface WithdrawalCalc {
    withdrawableAmount: bigint
    withdrawableCount: number,
    newInstallments: Installment[]
}

export const calculateClaimableIntervals = (
    currentTime: bigint,
    paymentData: PaymentDatum,
): WithdrawalCalc => {
    const index = paymentData.installments.findIndex((i) => i.claimable_at > currentTime)
    if (index == 0) {
        throw new Error("No installment withdrawable")
    }
    const withdrawableCount = (index > 0 ? index : paymentData.installments.length)

    const newInstallments = Array.from(paymentData.installments)
    const withdrawn = newInstallments.splice(0, withdrawableCount)
    const withdrawableAmount = withdrawn.reduce((acc, i) => acc + i.claimable_amount, 0n)

    return {
        withdrawableAmount,
        withdrawableCount,
        newInstallments
    }
}

export const findUnsubscribePaymentUTxO = (
    paymentUTxOs: UTxO[],
    serviceNftTn: string,
    subscriberNftTn: string,
): Effect.Effect<UTxO, TransactionError, never> => {
    return Effect.gen(function* () {
        console.log("Starting search for UTxO with:")
        console.log("  - Service NFT:", serviceNftTn)
        console.log("  - Subscriber NFT:", subscriberNftTn)

        const results = paymentUTxOs.map((utxo) => {
            try {
                const datum = getPaymentValidatorDatum(utxo)
                const serviceMatch = datum[0].service_nft_tn === serviceNftTn
                const subscriberMatch = datum[0].subscriber_nft_tn === subscriberNftTn

                console.log(`\nChecking UTxO ${utxo.txHash.slice(0, 8)}:`)
                console.log("  Service NFT matches:", serviceMatch)
                console.log("  Subscriber NFT matches:", subscriberMatch)

                if (serviceMatch && subscriberMatch) {
                    console.log("  Found matching UTxO!")
                    return utxo
                }
                return undefined
            } catch (error) {
                console.log(`\nError processing UTxO ${utxo.txHash.slice(0, 8)}:`, error)
                return undefined
            }
        })

        const paymentUTxO = results.find((result) => result !== undefined)

        if (!paymentUTxO) {
            console.log("\nNo matching UTxO found!")
            return yield* Effect.fail(
                new TxBuilderError({
                    cause: "No active subscription found for this subscriber and service",
                }),
            )
        }

        console.log("\nFound matching UTxO:", paymentUTxO.txHash)
        return paymentUTxO
    })
}

export const findPaymentToWithdraw = (
    paymentUTxOs: UTxO[],
    serviceNftTn: string,
    subscriber_nft_tn: string
): {
    paymentUTxO: UTxO,
    paymentDatum: PaymentDatum
} => {
    for (const utxo of paymentUTxOs) {
        try {
            const paymentDatum = getPaymentValidatorDatum(utxo)[0]
            if (paymentDatum.service_nft_tn === serviceNftTn && paymentDatum.subscriber_nft_tn === subscriber_nft_tn) {
                return {
                    paymentUTxO: utxo,
                    paymentDatum: paymentDatum,
                }
            }
        } catch {
            continue
        }
    }
    throw new Error(`No payment found for service ${serviceNftTn}`)
}
