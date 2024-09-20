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
    toUnit,
    TransactionError,
    TxSignBuilder,
    UTxO,
    validatorToAddress,
} from "@lucid-evolution/lucid";
import {
    fromAddress,
    fromAssets,
    getServiceMultiValidator,
    selectUtxos,
} from "../core/utils/index.js";
import {
    CreateServiceConfig,
    Result,
    UpdateServiceConfig,
} from "../core/types.js";
import {
    ADA,
    CreateServiceRedeemer,
    CreateServiceSchema,
    MintServiceRedeemer,
    OutputReference,
    OutputReferenceSchema,
    ServiceDatum,
    // UpdateService,
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
    config: UpdateServiceConfig,
): Promise<Result<TxSignBuilder>> => {
    console.log("updateService..........: ");
    const merchantAddress: Address = await lucid.wallet().address();

    const validators = getServiceMultiValidator(lucid, config.scripts);
    const servicePolicyId = mintingPolicyToId(validators.mintServiceValidator);

    console.log("servicePolicyId: ", servicePolicyId);

    const merchantUTxOs = await lucid.utxosAt(merchantAddress);
    // const contractUTxOs = await lucid.utxosAt(validators.mintServiceValAddress);
    // const mintUtxoScriptRef = contractUTxOs.find((utxo) =>
    //   utxo.scriptRef ?? null
    // );

    if (!merchantUTxOs || !merchantUTxOs.length) {
        console.error("No UTxO found at user address: " + merchantAddress);
    }
    // const serviceNFTUTxO = merchantUTxOs.find((utxo) =>
    //     Object.keys(utxo.assets).some((asset) =>
    //         asset.startsWith(servicePolicyId) && utxo.assets[asset] === 1n
    //     )
    // );

    // Selecting a utxo containing atleast 5 ADA to cover tx fees and min ADA
    // Note: To avoid tx balancing errors, the utxo should only contain lovelaces
    // const selectedUTxOs = selectUTxOs(merchantUTxOs, { ["lovelace"]: 5000000n });
    // const { refTokenName, userTokenName } = createServiceTokens(
    //     merchantUTxOs[0],
    // );
    // console.log("refTokenName: ", refTokenName);

    // const refToken = toUnit(
    //     servicePolicyId,
    //     refTokenName,
    // );
    // const serviceUTxOs = await lucid.utxosAt(validators.spendServiceValAddress);

    // const serviceUTxO = serviceUTxOs.find((utxo) =>
    //     Object.keys(utxo.assets).some((asset) =>
    //         asset.startsWith(servicePolicyId) && utxo.assets[asset] === 1n
    //     )
    // );
    // const validatorAddress: Address = validators.spendServiceValAddress;
    // const network = lucid.config().network;
    // const nftLockerAddress = validatorToAddress(network, config.scripts.spending.);
    const refToken = toUnit(
        "0d7895b6e27a70a4175c822a1e792a2fdc59817f7f7773079044812f",
        "000643b09e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db7199",
    );

    const userNft = toUnit(
        "0d7895b6e27a70a4175c822a1e792a2fdc59817f7f7773079044812f",
        "000de1409e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db7199",
    );

    const serviceUTxO = await lucid.utxosAtWithUnit(
        validators.spendServiceValAddress,
        refToken,
    );

    if (!serviceUTxO) {
        throw new Error("Service NFT not found");
    }
    console.log("serviceNFTUTxO: ", serviceUTxO);

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

    const updatedDatum: ServiceDatum = {
        service_fee: config.new_service_fee,
        service_fee_qty: config.new_service_fee_qty,
        penalty_fee: config.new_penalty_fee,
        penalty_fee_qty: config.new_penalty_fee_qty,
        interval_length: config.new_interval_length,
        num_intervals: config.new_num_intervals,
        minimum_ada: config.new_minimum_ada,
    };

    const directDatum = Data.to<ServiceDatum>(updatedDatum, ServiceDatum);

    const output_ref: OutputReference = {
        txHash: { hash: merchantUTxOs[0].txHash },
        outputIndex: BigInt(merchantUTxOs[0].outputIndex),
    };

    const createService: CreateServiceRedeemer = {
        output_reference: output_ref,
        input_index: output_ref.outputIndex,
    };

    // const updateService: MintServiceRedeemer = "UpdateService";
    // const removeService: MintServiceRedeemer = "RemoveService";

    const updateService = Data.to<MintServiceRedeemer>(
        "UpdateService",
        MintServiceRedeemer,
    );
    const removeService = Data.to<MintServiceRedeemer>(
        "RemoveService",
        MintServiceRedeemer,
    );
    console.log("Redeemer updateService: ", updateService);

    try {
        const tx = await lucid
            .newTx()
            .collectFrom(merchantUTxOs)
            .collectFrom(serviceUTxO, updateService)
            // .pay.ToContract(validators.spendServiceValAddress, {
            //     kind: "inline",
            //     value: directDatum,
            // }, {
            //     lovelace: 3_000_000n,
            //     [refToken]: 1n,
            // })
            .pay.ToAddress(merchantAddress, {
                [userNft]: 1n,
            })
            .attach.SpendingValidator(validators.spendServiceValidator)
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
