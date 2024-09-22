import {
    Address,
    Data,
    fromText,
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
    CreateAccountConfig,
    CreateServiceConfig,
    Result,
    UpdateServiceConfig,
} from "../core/types.js";
import {
    AccountDatum,
    ADA,
    getMultiValidator,
    ServiceDatum,
} from "../core/index.js";
import {
    assetNameLabels,
    generateUniqueAssetName,
} from "../core/utils/assets.js";

const createUniqueTokens = (utxo: UTxO) => {
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
    const validators = getMultiValidator(lucid, config.scripts);
    const accountPolicyId = mintingPolicyToId(validators.mintValidator);
    const merchantAddress: Address = await lucid.wallet().address();
    const merchantUTxOs = await lucid.utxosAt(merchantAddress);

    const contractUTxOs = await lucid.utxosAt(
        validators.spendValAddress,
    );

    const { refTokenName, userTokenName } = createUniqueTokens(
        merchantUTxOs[0],
    );
    console.log(
        "Service Validator Address: BEFORE>>>",
        validators.spendValAddress,
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
        is_active: config.is_active,
    };

    const directDatum = Data.to<ServiceDatum>(currDatum, ServiceDatum);

    const refToken = toUnit(
        accountPolicyId,
        refTokenName,
    );

    console.log("PolicyId: ", accountPolicyId);
    console.log("refTokenName: ", refTokenName);
    console.log("userTokenName: ", userTokenName);

    try {
        const tx = await lucid
            .newTx()
            .pay.ToContract(
                validators.spendValAddress,
                { kind: "inline", value: directDatum },
                { lovelace: 5_000_000n, [refToken]: 1n },
                validators.spendValidator,
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

export const sendTokenToAccount = async (
    lucid: LucidEvolution,
    config: CreateAccountConfig,
): Promise<Result<TxSignBuilder>> => {
    console.log("sendTokenToAccount...");
    const validators = getMultiValidator(lucid, config.scripts);
    const accountPolicyId = mintingPolicyToId(validators.mintValidator);
    const merchantAddress: Address = await lucid.wallet().address();
    const merchantUTxOs = await lucid.utxosAt(merchantAddress);

    const contractUTxOs = await lucid.utxosAt(
        validators.spendValAddress,
    );

    const { refTokenName, userTokenName } = createUniqueTokens(
        merchantUTxOs[0],
    );
    console.log(
        "Account Validator Address: BEFORE>>>",
        validators.spendValAddress,
    );
    console.log("Account Validator UTxO: BEFORE>>>", contractUTxOs);
    const currDatum: AccountDatum = {
        email: fromText(config.email),
        phone: fromText(config.phone),
        account_created: config.account_created,
    };

    const directDatum = Data.to<AccountDatum>(currDatum, AccountDatum);

    const refToken = toUnit(
        accountPolicyId,
        refTokenName,
    );

    console.log("PolicyId: ", accountPolicyId);
    console.log("refTokenName: ", refTokenName);
    console.log("userTokenName: ", userTokenName);

    try {
        const tx = await lucid
            .newTx()
            .pay.ToContract(
                validators.spendValAddress,
                { kind: "inline", value: directDatum },
                { lovelace: 5_000_000n, [refToken]: 1n },
                validators.spendValidator,
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
