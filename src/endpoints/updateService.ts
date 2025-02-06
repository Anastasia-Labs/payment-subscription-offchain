import {
    Address,
    Constr,
    Data,
    LucidEvolution,
    RedeemerBuilder,
    toUnit,
    TransactionError,
    TxSignBuilder,
    UTxO,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { UpdateServiceConfig } from "../core/types.js";
import { ServiceDatum } from "../core/contract.types.js";
import { Effect } from "effect";
import { getServiceValidatorDatum } from "./utils.js";
import {
    servicePolicyId,
    serviceScript,
} from "../core/validators/constants.js";

export const updateServiceProgram = (
    lucid: LucidEvolution,
    config: UpdateServiceConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () {
        const merchantAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const validators = getMultiValidator(lucid, serviceScript);
        const serviceValAddress = validators.spendValAddress;
        // const servicePolicyId = mintingPolicyToId(validators.mintValidator);

        const merchantUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(merchantAddress)
        );
        const allServiceUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(serviceValAddress)
        );

        if (!merchantUTxOs || !merchantUTxOs.length) {
            console.error("No UTxO found at user address: " + merchantAddress);
        }

        const serviceNFT = toUnit(
            servicePolicyId,
            config.service_nft_tn,
        );

        const merchantNFT = toUnit(
            servicePolicyId,
            config.merchant_nft_tn,
        );

        const serviceUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                serviceNFT,
            )
        );

        const merchantUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                merchantNFT,
            )
        );

        if (!serviceUTxO) {
            throw new Error("Service NFT not found");
        }

        // const activeServiceUTxOs = allServiceUTxOs.filter((utxo: UTxO) => {
        //     if (!utxo.datum) return false;

        //     const datum = Data.from<ServiceDatum>(utxo.datum, ServiceDatum);

        //     return datum.is_active === true;
        // });

        const serviceData = yield* Effect.promise(
            () => (getServiceValidatorDatum(serviceUTxO)),
        );

        const updatedDatum: ServiceDatum = {
            service_fee_policyid: serviceData[0].service_fee_policyid,
            service_fee_assetname: serviceData[0].service_fee_assetname,
            service_fee: config.new_service_fee,
            penalty_fee_policyid: serviceData[0].penalty_fee_policyid,
            penalty_fee_assetname: serviceData[0].penalty_fee_assetname,
            penalty_fee: config.new_penalty_fee,
            interval_length: config.new_interval_length,
            num_intervals: config.new_num_intervals,
            is_active: serviceData[0].is_active,
        };

        const directDatum = Data.to<ServiceDatum>(updatedDatum, ServiceDatum);

        // const wrappedRedeemer = Data.to(new Constr(1, [new Constr(0, [])]));

        const updateServiceRedeemer: RedeemerBuilder = {
            kind: "selected",
            makeRedeemer: (inputIndices: bigint[]) => {
                // Construct the redeemer using the input indices
                const merchantIndex = inputIndices[0];
                const serviceIndex = inputIndices[1];

                return Data.to(
                    new Constr(1, [
                        new Constr(0, [
                            config.service_nft_tn,
                            BigInt(merchantIndex),
                            BigInt(serviceIndex),
                            BigInt(serviceUTxO.outputIndex),
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
            .collectFrom([serviceUTxO], updateServiceRedeemer)
            .pay.ToAddress(merchantAddress, {
                [merchantNFT]: 1n,
            })
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
