import {
    Address,
    Constr,
    Data,
    LucidEvolution,
    mintingPolicyToId,
    toUnit,
    TxSignBuilder,
    UTxO,
} from "@lucid-evolution/lucid";
import {
    getServiceMultiValidator,
} from "../core/utils/index.js";
import {
    Result,
    UpdateServiceConfig,
} from "../core/types.js";
import {
    SpendServiceRedeemer,
    ServiceDatum,
} from "../core/contract.types.js";

export const updateService = async (
    lucid: LucidEvolution,
    config: UpdateServiceConfig,
): Promise<Result<TxSignBuilder>> => {
    console.log("updateService..........: ");
    

    const validators = getServiceMultiValidator(lucid, config.scripts);
    
    const servicePolicyId = mintingPolicyToId(validators.mintServiceValidator);

    const merchantAddress: Address = await lucid.wallet().address();
    const merchantUTxOs = await lucid.utxosAt(merchantAddress);

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

    const serviceUTxO = await lucid.utxosAtWithUnit(
        validators.spendServiceValAddress,
        refToken,
    );

    if (!serviceUTxO) {
        throw new Error("Service NFT not found");
    }

    const updatedDatumConfig: ServiceDatum = {
        service_fee: config.new_service_fee,
        service_fee_qty: config.new_service_fee_qty,
        penalty_fee: config.new_penalty_fee,
        penalty_fee_qty: config.new_penalty_fee_qty,
        interval_length: config.new_interval_length,
        num_intervals: config.new_num_intervals,
        minimum_ada: config.new_minimum_ada,
        is_active : config.is_active
    };

    const updatedDatum = Data.to<ServiceDatum>(updatedDatumConfig, ServiceDatum);

    const updateService = Data.to<SpendServiceRedeemer>(
        "UpdateService",
        SpendServiceRedeemer,
    );

    const wrappedRedeemer =  Data.to(new Constr(1, [new Constr(0,[])]));

    try {
        const tx = await lucid
            .newTx()
            .collectFrom(merchantUTxOs)
            .collectFrom(serviceUTxO, wrappedRedeemer)
            .pay.ToContract(validators.spendServiceValAddress, {
                kind: "inline",
                value: updatedDatum,
            }, {
                lovelace: 3_000_000n,
                [refToken]: 1n,
            })
            .pay.ToAddress(merchantAddress, {
                [userNft]: 1n,
            })
            .attach.SpendingValidator(validators.spendServiceValidator)
            .complete();

        return { type: "ok", data: tx };
    } catch (error) {
        if (error instanceof Error) return { type: "error", error: error };
        return { type: "error", error: new Error(`${JSON.stringify(error)}`) };
    }
};
