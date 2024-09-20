import {
    Address,
    Data,
    LucidEvolution,
    mintingPolicyToId,
    Script,
    SpendingValidator,
    toUnit,
    TxSignBuilder,
    UTxO,
    validatorToRewardAddress,
} from "@lucid-evolution/lucid";

import {
    CreateServiceConfig,
    Result,
    UpdateServiceConfig,
} from "../core/types.js";
import { ADA, getServiceMultiValidator, ServiceDatum } from "../core/index.js";
import {
    assetNameLabels,
    generateUniqueAssetName,
} from "../core/utils/assets.js";

const createServiceTokens = (utxo: UTxO) => {
    const refTokenName = generateUniqueAssetName(
        utxo,
        assetNameLabels.prefix100,
    );
    const userTokenName = generateUniqueAssetName(
        utxo,
        assetNameLabels.prefix222,
    );
    return { refTokenName, userTokenName };
};

export const sendTokenToService = async (
    lucid: LucidEvolution,
    config: CreateServiceConfig,
): Promise<Result<TxSignBuilder>> => {
    console.log("sendTokenToService...");
    const validators = getServiceMultiValidator(lucid, config.scripts);
    const servicePolicyId = mintingPolicyToId(validators.mintServiceValidator);
    const merchantAddress: Address = await lucid.wallet().address();
    const merchantUTxOs = await lucid.utxosAt(merchantAddress);

    const contractUTxOs = await lucid.utxosAt(
        validators.spendServiceValAddress,
    );

    const { refTokenName, userTokenName } = createServiceTokens(
        merchantUTxOs[0],
    );
    console.log(
        "Service Validator Address: BEFORE>>>",
        validators.spendServiceValAddress,
    );
    console.log("Service Validator UTxO: BEFORE>>>", contractUTxOs);
    const currDatum: ServiceDatum = {
        service_fee: config.service_fee,
        service_fee_qty: config.service_fee_qty,
        penalty_fee: config.penalty_fee,
        penalty_fee_qty: config.penalty_fee_qty,
        interval_length: config.interval_length,
        num_intervals: config.num_intervals,
        minimum_ada: config.minimum_ada,
    };

    const directDatum = Data.to<ServiceDatum>(currDatum, ServiceDatum);

    const refToken = toUnit(
        servicePolicyId,
        refTokenName,
    );

    console.log("PolicyId: ", servicePolicyId);
    console.log("refTokenName: ", refTokenName);
    console.log("userTokenName: ", userTokenName);

    try {
        const tx = await lucid
            .newTx()
            .pay.ToContract(
                validators.spendServiceValAddress,
                { kind: "inline", value: directDatum },
                { lovelace: 5_000_000n, [refToken]: 1n },
            )
            .complete();

       // console.log("data: ", tx.toJSON());
        return { type: "ok", data: tx };
    } catch (error) {
        console.log("ERROR: ", error);

        if (error instanceof Error) return { type: "error", error: error };
        return { type: "error", error: new Error(`${JSON.stringify(error)}`) };
    }
};
