import {
    Address,
    Constr,
    Data,
    LucidEvolution,
    TransactionError,
    TxBuilderError,
    TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { UpdateServiceConfig } from "../core/types.js";
import { ServiceDatum } from "../core/contract.types.js";
import { Effect } from "effect";

export const updateServiceDatum = (
    lucid: LucidEvolution,
    config: UpdateServiceConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () {
        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const validators = getMultiValidator(lucid, config.scripts);
        const serviceValAddress = validators.spendValAddress;

        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(subscriberAddress)
        );

        if (!subscriberUTxOs || !subscriberUTxOs.length) {
            yield* Effect.fail(
                new TxBuilderError({
                    cause: "No UTxO found at user address: " +
                        subscriberAddress,
                }),
            );
        }

        const serviceUTxO = yield* Effect.promise(() =>
            lucid.utxosAtWithUnit(
                serviceValAddress,
                config.ref_token,
            )
        );

        const subscriberUTxO = yield* Effect.promise(() =>
            lucid.utxosAtWithUnit(
                subscriberAddress,
                config.user_token,
            )
        );

        if (!serviceUTxO) {
            yield* Effect.fail(
                new TxBuilderError({
                    cause: "Service NFT not found ",
                }),
            );
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

        const wrappedRedeemer = Data.to(new Constr(1, [new Constr(0, [])]));

        const tx = yield* lucid
            .newTx()
            .collectFrom(subscriberUTxO)
            .collectFrom(serviceUTxO, wrappedRedeemer)
            .pay.ToAddress(subscriberAddress, {
                lovelace: 3_000_000n,
                [config.user_token]: 1n,
            })
            .pay.ToAddressWithData(serviceValAddress, {
                kind: "inline",
                value: directDatum,
            }, {
                lovelace: 2_000_000n,
                [config.ref_token]: 1n,
            })
            .attach.SpendingValidator(validators.spendValidator)
            .completeProgram();

        return tx;
    });
