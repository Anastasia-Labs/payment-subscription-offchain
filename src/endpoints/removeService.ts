import {
    Address,
    Constr,
    Data,
    LucidEvolution,
    TransactionError,
    TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { RemoveServiceConfig, UpdateServiceConfig } from "../core/types.js";
import { ServiceDatum } from "../core/contract.types.js";
import { Effect } from "effect";

export const removeService = (
    lucid: LucidEvolution,
    config: RemoveServiceConfig,

): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () { // return type ,
        console.log("Remove Service..........: ");
        const merchantAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const validators = getMultiValidator(lucid, config.scripts);
        const serviceValAddress = validators.spendValAddress;

        const merchantUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(merchantAddress)
        );

        if (!merchantUTxOs || !merchantUTxOs.length) {
            console.error("No UTxO found at user address: " + merchantAddress);
        }

        const serviceUTxO = yield* Effect.promise(() =>
            lucid.utxosAtWithUnit(
                serviceValAddress,
                config.ref_token,
            )
        );

        const merchantUTxO = yield* Effect.promise(() =>
            lucid.utxosAtWithUnit(
                merchantAddress,
                config.user_token,
            )
        );

        if (!serviceUTxO) {
            throw new Error("Service NFT not found");
        }
        console.log("serviceNFTUTxO: ", serviceUTxO);

        console.log("Merchant Utxo", merchantUTxO);

        // i should parse the datum from the utxo to find

        const updatedDatum: ServiceDatum = {
            service_fee: config.service_fee,
            service_fee_qty: config.service_fee_qty,
            penalty_fee: config.penalty_fee,
            penalty_fee_qty: config.penalty_fee_qty,
            interval_length: config.interval_length,
            num_intervals: config.num_intervals,
            minimum_ada: config.minimum_ada,
            is_active: config.is_active,
        };

        const directDatum = Data.to<ServiceDatum>(updatedDatum, ServiceDatum);

        const wrappedRedeemer = Data.to(new Constr(1, [new Constr(1, [])]));

        console.log("Redeemer updateService: ", wrappedRedeemer);
        console.log("Datum serviceDatum: ", directDatum);
        //console.log("Datum service_fee_qty: ", config.new_service_fee_qty);

        const tx = yield* lucid
            .newTx()  
            .collectFrom(merchantUTxO)
            .collectFrom(serviceUTxO,wrappedRedeemer)
           //.collectFrom(serviceUTxO)
            .pay.ToContract(serviceValAddress, {
                kind: "inline",
                value: directDatum,
            }, {
                //lovelace: 3_000_000n,
                [config.ref_token]: 1n,
            })
            .pay.ToAddress(merchantAddress, {
               // lovelace: 3_000_000n,
                [config.user_token]: 1n,
            })
            .attach.SpendingValidator(validators.spendValidator)
            .completeProgram();

        return tx;
    });
