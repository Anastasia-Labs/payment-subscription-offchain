import {
    Data,
    LucidEvolution,
    Script,
    SpendingValidator,
    TxSignBuilder,
    validatorToRewardAddress,
} from "@lucid-evolution/lucid";

import { CreateServiceConfig, Result } from "../core/types.js";
import { ADA, getServiceMultiValidator, ServiceDatum } from "../core/index.js";

export const sendTokenToService = async (
    lucid: LucidEvolution,
    config: CreateServiceConfig,
): Promise<Result<TxSignBuilder>> => {
    console.log("sendTokenToService...");
    const validators = getServiceMultiValidator(lucid, config.scripts);

    const contractUTxOs = await lucid.utxosAt(
        validators.spendServiceValAddress,
    );

    console.log(
        "Service Validator Address: BEFORE>>>",
        validators.spendServiceValAddress,
    );
    console.log("Service Validator UTxO: BEFORE>>>", contractUTxOs);
    const currDatum: ServiceDatum = {
        service_fee: ADA,
        service_fee_qty: 10_000_000n,
        penalty_fee: ADA,
        penalty_fee_qty: 1_000_000n,
        interval_length: 1n,
        num_intervals: 12n,
        minimum_ada: 2_000_000n,
    };

    const directDatum = Data.to<ServiceDatum>(currDatum, ServiceDatum);
    try {
        const tx = await lucid
            .newTx()
            .pay.ToContract(
                validators.spendServiceValAddress,
                { kind: "inline", value: directDatum },
                { lovelace: 5000000n },
            )
            .attach.SpendingValidator(validators.spendServiceValidator)
            .complete();

        console.log("data: ", tx.toJSON());
        return { type: "ok", data: tx };
    } catch (error) {
        console.log("ERROR: ", error);

        if (error instanceof Error) return { type: "error", error: error };
        return { type: "error", error: new Error(`${JSON.stringify(error)}`) };
    }
};
