import {
    Constr,
    Data,
    LucidEvolution,
    RedeemerBuilder,
    toUnit,
    TransactionError,
    TxSignBuilder,
} from "@lucid-evolution/lucid"
import { getMultiValidator } from "../core/utils/index.js"
import { UpdateServiceConfig } from "../core/types.js"
import { ServiceDatum } from "../core/contract.types.js"
import { Effect } from "effect"
import { getServiceValidatorDatum } from "./utils.js"
import {
    servicePolicyId,
    serviceScript,
} from "../core/validators/constants.js"

export const updateServiceProgram = (
    lucid: LucidEvolution,
    config: UpdateServiceConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () {
        const validators = getMultiValidator(lucid, serviceScript)
        const serviceValAddress = validators.spendValAddress

        const serviceNFT = toUnit(servicePolicyId, config.service_nft_tn)
        const merchantNFT = toUnit(servicePolicyId, config.merchant_nft_tn)

        const serviceUTxO = yield* Effect.promise(() => lucid.utxoByUnit(serviceNFT))
        const merchantUTxO = yield* Effect.promise(() => lucid.utxoByUnit(merchantNFT))

        if (!serviceUTxO) {
            throw new Error("Service NFT not found")
        }

        const serviceData = getServiceValidatorDatum(serviceUTxO)
        if (!serviceData || !serviceData.length) {
            throw new Error("Service not found")
        }
        const serviceDatum = serviceData[0]

        const updatedDatum: ServiceDatum = {
            service_fee_policyid: serviceDatum.service_fee_policyid,
            service_fee_assetname: serviceDatum.service_fee_assetname,
            service_fee: config.new_service_fee,
            penalty_fee_policyid: serviceDatum.penalty_fee_policyid,
            penalty_fee_assetname: serviceDatum.penalty_fee_assetname,
            penalty_fee: config.new_penalty_fee,
            interval_length: config.new_interval_length,
            num_intervals: config.new_num_intervals,
            is_active: serviceDatum.is_active,
        }

        const directDatum = Data.to<ServiceDatum>(updatedDatum, ServiceDatum)

        const updateServiceRedeemer: RedeemerBuilder = {
            kind: "selected",
            makeRedeemer: (inputIndices: bigint[]) => {
                return Data.to(new Constr(0, [config.service_nft_tn, inputIndices[0], inputIndices[1], 0n]))
            },
            inputs: [merchantUTxO, serviceUTxO],
        }

        const tx = yield* lucid
            .newTx()
            .collectFrom([merchantUTxO])
            .collectFrom([serviceUTxO], updateServiceRedeemer)
            .pay.ToContract(serviceValAddress, {
                kind: "inline",
                value: directDatum,
            }, {
                [serviceNFT]: 1n,
            })
            .attach.SpendingValidator(validators.spendValidator)
            .completeProgram({ localUPLCEval: true })

        return tx
    })
