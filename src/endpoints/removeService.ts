import {
    Constr,
    Data,
    LucidEvolution,
    RedeemerBuilder,
    toUnit,
    TransactionError,
    TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { ServiceDatum } from "../core/contract.types.js";
import { Effect } from "effect";
import { getServiceValidatorDatum } from "./utils.js";
import {
    servicePolicyId,
    serviceScript,
} from "../core/validators/constants.js";
import { RemoveServiceConfig } from "../core/types.js";

export const removeServiceProgram = (
    lucid: LucidEvolution,
    config: RemoveServiceConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () {
        const validators = getMultiValidator(lucid, serviceScript);

        const serviceValAddress = validators.spendValAddress;

        const serviceNFT = toUnit(servicePolicyId, config.service_nft_tn);
        const merchantNFT = toUnit(servicePolicyId, config.merchant_nft_tn);

        const serviceUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(serviceNFT)
        );
        if (!serviceUTxO) {
            throw new Error("Service serviceUTxO not found");
        }

        const serviceData = getServiceValidatorDatum(serviceUTxO);
        if (!serviceData || serviceData.length === 0) {
            throw new Error("serviceData is empty");
        }
        const serviceDatum = serviceData[0];

        const merchantUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(merchantNFT)
        );

        const updatedDatum: ServiceDatum = {
            service_fee_policyid: serviceDatum.service_fee_policyid,
            service_fee_assetname: serviceDatum.service_fee_assetname,
            service_fee: serviceDatum.service_fee,
            penalty_fee_policyid: serviceDatum.penalty_fee_policyid,
            penalty_fee_assetname: serviceDatum.penalty_fee_assetname,
            penalty_fee: serviceDatum.penalty_fee,
            interval_length: serviceDatum.interval_length,
            num_intervals: serviceDatum.num_intervals,
            is_active: false,
        };

        const directDatum = Data.to<ServiceDatum>(updatedDatum, ServiceDatum);

        const removeServiceRedeemer: RedeemerBuilder = {
            kind: "selected",
            makeRedeemer: (inputIndices: bigint[]) => {
                return Data.to(
                    new Constr(1, [
                        config.service_nft_tn,
                        inputIndices[0],
                        inputIndices[1],
                        0n,
                    ]),
                );
            },
            inputs: [merchantUTxO, serviceUTxO],
        };

        const tx = yield* lucid
            .newTx()
            .collectFrom([merchantUTxO])
            .collectFrom([serviceUTxO], removeServiceRedeemer)
            .pay.ToContract(serviceValAddress, {
                kind: "inline",
                value: directDatum,
            }, {
                [serviceNFT]: 1n,
            })
            .attach.SpendingValidator(validators.spendValidator)
            .completeProgram();

        return tx;
    });
