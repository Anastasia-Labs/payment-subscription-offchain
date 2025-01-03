import {
    Address,
    Constr,
    Data,
    LucidEvolution,
    mintingPolicyToId,
    RedeemerBuilder,
    toUnit,
    TransactionError,
    TxSignBuilder,
} from "@lucid-evolution/lucid";
import { findCip68TokenNames, getMultiValidator } from "../core/utils/index.js";
// import { RemoveServiceConfig } from "../core/types.js";
import { ServiceDatum } from "../core/contract.types.js";
import { Effect } from "effect";
import { getServiceValidatorDatum } from "./utils.js";
import {
    servicePolicyId,
    serviceScript,
} from "../core/validators/constants.js";

export const removeServiceProgram = (
    lucid: LucidEvolution,
    // config: RemoveServiceConfig,
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

        const { refTokenName: serviceNftTn, userTokenName: merchantNftTn } =
            findCip68TokenNames(
                [serviceUTxOs[0], merchantUTxOs[0]],
                servicePolicyId,
            );

        const serviceNFT = toUnit(
            servicePolicyId,
            serviceNftTn,
        );

        const merchantNFT = toUnit(
            servicePolicyId,
            merchantNftTn,
        );

        if (!serviceUTxOs || !serviceUTxOs.length) {
            console.error(
                "No UTxO found at user address: " + serviceValAddress,
            );
        }

        // Get utxos where is_active in datum is set to true
        const activeServiceUTxOs = serviceUTxOs.filter((utxo) => {
            if (!utxo.datum) return false;

            const datum = Data.from<ServiceDatum>(utxo.datum, ServiceDatum);

            return datum.is_active === true;
        });

        const serviceData = yield* Effect.promise(
            () => (getServiceValidatorDatum(activeServiceUTxOs)),
        );

        if (!merchantUTxOs || !merchantUTxOs.length) {
            console.error("No UTxO found at user address: " + merchantAddress);
        }

        // let { user_token, ref_token } = extractTokens(
        //     servicePolicyId,
        //     serviceUTxOs,
        //     merchantUTxOs,
        // );

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

        // const serviceData = yield* Effect.promise(
        //     () => (getServiceValidatorDatum(serviceUTxOs)),
        // );

        if (!serviceData || serviceData.length === 0) {
            throw new Error("serviceData is empty");
        }
        const serviceDatum = serviceData[0];

        const updatedDatum: ServiceDatum = {
            service_fee: serviceDatum.service_fee,
            service_fee_qty: serviceDatum.service_fee_qty,
            penalty_fee: serviceDatum.penalty_fee,
            penalty_fee_qty: serviceDatum.penalty_fee_qty,
            interval_length: serviceDatum.interval_length,
            num_intervals: serviceDatum.num_intervals,
            minimum_ada: serviceDatum.minimum_ada,
            is_active: false,
        };

        const directDatum = Data.to<ServiceDatum>(updatedDatum, ServiceDatum);

        // const wrappedRedeemer = Data.to(new Constr(1, [new Constr(1, [])]));

        const removeServiceRedeemer: RedeemerBuilder = {
            kind: "selected",
            makeRedeemer: (inputIndices: bigint[]) => {
                // Construct the redeemer using the input indices
                const merchantIndex = inputIndices[0];
                const serviceIndex = inputIndices[1];

                return Data.to(
                    new Constr(1, [
                        new Constr(1, [
                            BigInt(merchantIndex),
                            BigInt(serviceIndex),
                        ]),
                    ]),
                );
            },
            // Specify the inputs relevant to the redeemer
            inputs: [merchantUTxO, serviceUTxO],
        };

        console.log("merchantUTxO", merchantUTxOs);
        console.log("serviceUTxO", serviceUTxO);

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
