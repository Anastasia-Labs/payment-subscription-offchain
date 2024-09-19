import {
    Address,
    Assets,
    Constr,
    Data,
    fromText,
    LucidEvolution,
    mintingPolicyToId,
    RedeemerBuilder,
    selectUTxOs,
    TransactionError,
    TxSignBuilder,
    UTxO,
} from "@lucid-evolution/lucid";
import {
    fromAddress,
    fromAssets,
    getServiceMultiValidator,
    selectUtxos,
} from "../core/utils/index.js";
import { CreateServiceConfig, Result } from "../core/types.js";
import {
    ADA,
    CreateServiceRedeemer,
    CreateServiceSchema,
    OutputReference,
    OutputReferenceSchema,
    ServiceDatum,
    Value,
} from "../core/contract.types.js";
import {
    assetNameLabels,
    generateUniqueAssetName,
} from "../core/utils/assets.js";
import { Effect } from "effect";

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

export const updateService = async (
    lucid: LucidEvolution,
    config: CreateServiceConfig,
): Promise<Result<TxSignBuilder>> => {
    const merchantAddress: Address = await lucid.wallet().address();

    const validators = getServiceMultiValidator(lucid, config.scripts);
    const servicePolicyId = mintingPolicyToId(validators.mintServiceValidator);

    console.log("servicePolicyId: ", servicePolicyId);

    // const toBuyValue: Value = fromAssets(config.toBuy);

    const merchantUTxOs = await lucid.utxosAt(merchantAddress);
    // const contractUTxOs = await lucid.utxosAt(validators.mintServiceValAddress);
    // const mintUtxoScriptRef = contractUTxOs.find((utxo) =>
    //   utxo.scriptRef ?? null
    // );

    if (!merchantUTxOs || !merchantUTxOs.length) {
        console.error("No UTxO found at user address: " + merchantAddress);
    }

    // Selecting a utxo containing atleast 5 ADA to cover tx fees and min ADA
    // Note: To avoid tx balancing errors, the utxo should only contain lovelaces
    // const selectedUTxOs = selectUTxOs(merchantUTxOs, { ["lovelace"]: 5000000n });
    const { refTokenName, userTokenName } = createServiceTokens(
        merchantUTxOs[0],
    );
    console.log("refTokenName: ", refTokenName);
    console.log("userTokenName: ", userTokenName);

    // Create the redeemer
    // const rdmrBuilderMint: RedeemerBuilder = {
    //   kind: "self",
    //   makeRedeemer: (inputIndex: bigint) => {
    //     const selectedUTxO = merchantUTxOs[0];
    //     // const inputIndex = selectedUTxO.outputIndex;
    //     // console.log("selectedUTxO :: ", selectedUTxO);

    //     const output_ref: OutputReference = {
    //       txHash: { hash: selectedUTxO.txHash },
    //       outputIndex: BigInt(selectedUTxO.outputIndex),
    //     };

    // const createService: CreateServiceRedeemer = {
    //   output_reference: output_ref,
    //   input_index: inputIndex,
    // };

    // return Data.to(createService, CreateServiceRedeemer);
    //     // return Data.to(
    //     //   new Constr(0, [Data.to(output_ref, OutputReference), inputIndices[0]),
    //     // );
    //   },
    //   // inputs: merchantUTxOs,
    // };

    // Create the redeemer
    const rdmrBuilderMint: RedeemerBuilder = {
        kind: "selected",
        makeRedeemer: (inputIndices: bigint[]) => {
            const selectedUTxO = merchantUTxOs[0];
            // const inputIndex = selectedUTxO.outputIndex;
            // console.log("selectedUTxO :: ", selectedUTxO);

            const output_ref: OutputReference = {
                txHash: { hash: selectedUTxO.txHash },
                outputIndex: BigInt(selectedUTxO.outputIndex),
            };

            const createService: CreateServiceRedeemer = {
                output_reference: output_ref,
                input_index: inputIndices[0],
            };

            console.log(
                "createService :: ",
                Data.to(createService, CreateServiceRedeemer),
            );
            return Data.to(createService, CreateServiceRedeemer);

            // return Data.to(
            //   new Constr(0, [Data.to(output_ref, OutputReference), inputIndices[0]]),
            // );
        },
        inputs: merchantUTxOs,
    };

    // console.log("REDEEMER :: ", rdmrBuilderMint);

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

    const output_ref: OutputReference = {
        txHash: { hash: merchantUTxOs[0].txHash },
        outputIndex: BigInt(merchantUTxOs[0].outputIndex),
    };

    const createService: CreateServiceRedeemer = {
        output_reference: output_ref,
        input_index: output_ref.outputIndex,
    };
    // add 2 ADA protocol fee and 2 ADA minADA deposit fee
    // protocol fee gets paid if the offer is accepted otherwise its returned.
    // config.offer["lovelace"] = (config.offer["lovelace"] || 0n) + 4_000_000n;

    // const walletUTxOs = await lucid.wallet().getUtxos();
    // console.log("merchantUTxOs :: ", merchantUTxOs);
    // console.log("mintServiceValidator :: ", validators.mintServiceValidator);

    // const feeUTxOs = selectUTxOs(selectedUTxOs, { lovelace: BigInt(2_000_000) });
    // console.log("feeUTxOs :: ", feeUTxOs);
    const mintingAssets: Assets = {
        [`${servicePolicyId}${refTokenName}`]: 1n,
        [`${servicePolicyId}${userTokenName}`]: 1n,
    };

    try {
        const tx = await lucid
            .newTx()
            .collectFrom(merchantUTxOs)
            // .pay.ToContract(validators.mintServiceValAddress, {
            //   kind: "inline",
            //   value: directDatum,
            // }, {
            //   lovelace: 1_000_000n,
            //   [`${servicePolicyId}${refTokenName}`]: 1n,
            // })
            // .pay.ToAddress(merchantAddress, {
            //   [`${servicePolicyId}${userTokenName}`]: 1n,
            // })
            .validTo(Date.now() + 900000)
            .attach.MintingPolicy(validators.mintServiceValidator)
            .complete();
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

        console.log("data: ", tx.toJSON());
        return { type: "ok", data: tx };
    } catch (error) {
        console.log("ERROR: ", error);

        if (error instanceof Error) return { type: "error", error: error };
        return { type: "error", error: new Error(`${JSON.stringify(error)}`) };
    }
};
