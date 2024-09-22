import {
    Address,
    Constr,
    Data,
    LucidEvolution,
    mintingPolicyToId,
    SpendingValidator,
    toUnit,
    TransactionError,
    TxSignBuilder,
    validatorToAddress,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { Result, UpdateServiceConfig } from "../core/types.js";
import { ServiceDatum } from "../core/contract.types.js";
import { Effect } from "effect";

export const updateService = (
    lucid: LucidEvolution,
    config: UpdateServiceConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () { // return type ,
        console.log("updateService..........: ");
        const merchantAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );

        // const validators = getMultiValidator(lucid, config.scripts);
        const spendValidator: SpendingValidator = {
            type: "PlutusV2",
            script: config.scripts.spending,
        };
        const validators = getMultiValidator(lucid, config.scripts);
        const servicePolicyId = mintingPolicyToId(
            validators.mintValidator,
        );

        const spendServiceValidatorAddress = validatorToAddress(
            lucid.config().network,
            spendValidator,
        );

        const merchantUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(merchantAddress)
        );
        // const contractUTxOs = await lucid.utxosAt(validators.mintServiceValAddress);
        // const mintUtxoScriptRef = contractUTxOs.find((utxo) =>
        //   utxo.scriptRef ?? null
        // );

        if (!merchantUTxOs || !merchantUTxOs.length) {
            console.error("No UTxO found at user address: " + merchantAddress);
        }

        const refToken = toUnit(
            servicePolicyId,
            "000643b09e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db7199",
        );

        const userNft = toUnit(
            servicePolicyId,
            "000de1409e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db7199",
        );

        const serviceUTxO = yield* Effect.promise(() =>
            lucid.utxosAtWithUnit(
                spendServiceValidatorAddress,
                refToken,
            )
        );

        const merchantUTxO = yield* Effect.promise(() =>
            lucid.utxosAtWithUnit(
                merchantAddress,
                userNft,
            )
        );

        if (!serviceUTxO) {
            throw new Error("Service NFT not found");
        }
        console.log("serviceNFTUTxO: ", serviceUTxO);

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

        // const updateService = Data.to<MintServiceRedeemer>(
        //     "UpdateService",
        //     MintServiceRedeemer,
        // );

        const wrappedRedeemer = Data.to(new Constr(1, [new Constr(0, [])]));

        console.log("Redeemer updateService: ", wrappedRedeemer);
        console.log("Datum serviceDatum: ", directDatum);
        console.log("Datum service_fee_qty: ", config.new_service_fee_qty);

        const tx = yield* lucid
            .newTx()
            .collectFrom(merchantUTxO)
            .collectFrom(serviceUTxO, wrappedRedeemer)
            .pay.ToAddress(merchantAddress, {
                lovelace: 3_000_000n,
                [userNft]: 1n,
            })
            .pay.ToContract(spendServiceValidatorAddress, {
                kind: "inline",
                value: directDatum,
            }, {
                lovelace: 3_000_000n,
                [refToken]: 1n,
            })
            .attach.SpendingValidator(spendValidator)
            .completeProgram();
        // .complete({
        //   coinSelection: false, // Setting to false to avoid using distributor funds
        // });
        // const tx = await lucid
        //   .newTx()
        // .collectFrom(feeUTxOs)
        //   .pay.ToContract(
        //     validators.mintServiceValAddress,
        // { kind: "inline", value: directDatum },
        //   )
        //   .complete();

        //console.log("data: ", tx.toJSON());
        // return { type: "ok", data: tx };
        return tx;
    });
