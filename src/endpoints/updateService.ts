import {
    Address,
    Constr,
    Data,
    LucidEvolution,
    mintingPolicyToId,
    RedeemerBuilder,
    TransactionError,
    TxSignBuilder,
    UTxO,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { UpdateServiceConfig } from "../core/types.js";
import { ServiceDatum } from "../core/contract.types.js";
import { Effect } from "effect";
import { extractTokens } from "./utils.js";

export const updateService = (
    lucid: LucidEvolution,
    config: UpdateServiceConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () {
        const merchantAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const validators = getMultiValidator(lucid, config.scripts);
        const serviceValAddress = validators.spendValAddress;
        const servicePolicyId = mintingPolicyToId(validators.mintValidator);

        const merchantUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(merchantAddress)
        );
        const allServiceUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(serviceValAddress)
        );

        const activeServiceUTxOs = allServiceUTxOs.filter((utxo: UTxO) => {
            if (!utxo.datum) return false;

            const datum = Data.from<ServiceDatum>(utxo.datum, ServiceDatum);

            return datum.is_active === true;
        });
        // const serviceUTxOs = yield* Effect.promise(() =>
        //     lucid.utxosAt(serviceValAddress)
        // );

        if (!merchantUTxOs || !merchantUTxOs.length) {
            console.error("No UTxO found at user address: " + merchantAddress);
        }

        let { user_token, ref_token } = extractTokens(
            servicePolicyId,
            activeServiceUTxOs,
            merchantUTxOs,
        );

        const serviceUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                ref_token,
            )
        );

        const merchantUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                user_token,
            )
        );

        if (!serviceUTxO) {
            throw new Error("Service NFT not found");
        }

        const updatedDatum: ServiceDatum = {
            service_fee: config.new_service_fee,
            service_fee_qty: config.new_service_fee_qty,
            penalty_fee: config.new_penalty_fee,
            penalty_fee_qty: config.new_penalty_fee_qty,
            interval_length: config.new_interval_length,
            num_intervals: config.new_num_intervals,
            minimum_ada: config.new_minimum_ada,
            is_active: config.is_active,
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
                            BigInt(merchantIndex),
                            BigInt(serviceIndex),
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
                lovelace: config.new_minimum_ada,
                [user_token]: 1n,
            })
            .pay.ToContract(serviceValAddress, {
                kind: "inline",
                value: directDatum,
            }, {
                [ref_token]: 1n,
            })
            .attach.SpendingValidator(validators.spendValidator)
            .completeProgram();

        return tx;
    });
