import {
    Address,
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
        const merchantAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const validators = getMultiValidator(lucid, serviceScript);

        const serviceValAddress = validators.spendValAddress;

        const serviceUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(serviceValAddress)
        );

        const merchantUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(merchantAddress)
        );

        const serviceNFT = toUnit(
            servicePolicyId,
            config.service_nft_tn,
        );

        const merchantNFT = toUnit(
            servicePolicyId,
            config.merchant_nft_tn,
        );

        if (!serviceUTxOs || !serviceUTxOs.length) {
            console.error(
                "No UTxO found at user address: " + serviceValAddress,
            );
        }

        if (!merchantUTxOs || !merchantUTxOs.length) {
            console.error("No UTxO found at user address: " + merchantAddress);
        }

        const serviceUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                serviceNFT,
            )
        );

        if (!serviceUTxO) {
            throw new Error("Service serviceUTxO not found");
        }

        const merchantUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                merchantNFT,
            )
        );

        const serviceData = yield* Effect.promise(
            () => (getServiceValidatorDatum(serviceUTxO)),
        );

        if (!serviceData || serviceData.length === 0) {
            throw new Error("serviceData is empty");
        }

        const updatedDatum: ServiceDatum = {
            service_fee_policyid: serviceData[0].service_fee_policyid,
            service_fee_assetname: serviceData[0].service_fee_assetname,
            service_fee: serviceData[0].service_fee,
            penalty_fee_policyid: serviceData[0].penalty_fee_policyid,
            penalty_fee_assetname: serviceData[0].penalty_fee_assetname,
            penalty_fee: serviceData[0].penalty_fee,
            interval_length: serviceData[0].interval_length,
            num_intervals: serviceData[0].num_intervals,
            is_active: false,
        };

        const directDatum = Data.to<ServiceDatum>(updatedDatum, ServiceDatum);

        // const wrappedRedeemer = Data.to(new Constr(1, [new Constr(1, [])]));
        console.log("outputIndex: ", serviceUTxO.outputIndex);

        const removeServiceRedeemer: RedeemerBuilder = {
            kind: "selected",
            makeRedeemer: (inputIndices: bigint[]) => {
                // Construct the redeemer using the input indices
                const merchantIndex = inputIndices[0];
                const serviceIndex = inputIndices[1];

                return Data.to(
                    new Constr(1, [
                        new Constr(1, [
                            config.service_nft_tn,
                            BigInt(merchantIndex),
                            BigInt(serviceIndex),
                            BigInt(merchantUTxO.outputIndex),
                        ]),
                    ]),
                );
            },
            // Specify the inputs relevant to the redeemer
            inputs: [merchantUTxO, serviceUTxO],
        };

        const tx = yield* lucid
            .newTx()
            .collectFrom(merchantUTxOs)
            .collectFrom([serviceUTxO], removeServiceRedeemer)
            .pay.ToContract(serviceValAddress, {
                kind: "inline",
                value: directDatum,
            }, {
                [serviceNFT]: 1n,
            })
            .pay.ToAddress(merchantAddress, {
                [merchantNFT]: 1n,
            })
            .attach.SpendingValidator(validators.spendValidator)
            .completeProgram();

        return tx;
    });
