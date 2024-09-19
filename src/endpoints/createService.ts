import {
  Address,
  Assets,
  Constr,
  Data,
  fromHex,
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
  CreateServiceRedeemer,
  OutputReference,
  ServiceDatum,
  Value,
} from "../core/contract.types.js";
import {
  assetNameLabels,
  generateUniqueAssetName,
} from "../core/utils/assets.js";
import { Effect } from "effect";

export const ADA = {
  symbol: "",
  name: "",
};

// const assetNameLabels = {
//   prefix100: "000643b0",
//   prefix222: "000de140",
//   prefix333: "0014df10",
//   prefix444: "001bc280",
// };

const createServiceTokens = (utxo: UTxO) => {
  const refTokenName = generateUniqueAssetName(utxo, assetNameLabels.prefix100);
  const userTokenName = generateUniqueAssetName(
    utxo,
    assetNameLabels.prefix222,
  );
  return { refTokenName, userTokenName };
};

export const createService = async (
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
  const { refTokenName, userTokenName } = createServiceTokens(merchantUTxOs[0]);
  console.log("refTokenName: ", refTokenName);
  console.log("userTokenName: ", userTokenName);

  const mintingAssets: Assets = {
    [`${servicePolicyId}${refTokenName}`]: 1n,
    [`${servicePolicyId}${userTokenName}`]: 1n,
  };

  // Create the redeemer
  const rdmrBuilderMint: RedeemerBuilder = {
    kind: "selected",
    makeRedeemer: (inputIndices: bigint[]) => {
      const redeemer: CreateServiceRedeemer = {
        output_reference: {
          txHash: { hash: merchantUTxOs[0].txHash },
          outputIndex: BigInt(merchantUTxOs[0].outputIndex),
        },
        input_index: inputIndices[0],
      };
      return Data.to(redeemer, CreateServiceRedeemer);
    },
    inputs: [merchantUTxOs[0]],
  };

  console.log("REDEEMER :: ", rdmrBuilderMint);

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
  // add 2 ADA protocol fee and 2 ADA minADA deposit fee
  // protocol fee gets paid if the offer is accepted otherwise its returned.
  // config.offer["lovelace"] = (config.offer["lovelace"] || 0n) + 4_000_000n;

  // const walletUTxOs = await lucid.wallet().getUtxos();
  console.log("merchantUTxOs :: ", merchantUTxOs);

  // const feeUTxOs = selectUTxOs(selectedUTxOs, { lovelace: BigInt(2_000_000) });
  // console.log("feeUTxOs :: ", feeUTxOs);

  try {
    const tx = await lucid
      .newTx()
      .collectFrom(merchantUTxOs)
      .mintAssets(
        mintingAssets,
        rdmrBuilderMint,
      )
      .pay.ToContract(validators.mintServiceValAddress, {
        kind: "inline",
        value: directDatum,
      }, {
        lovelace: 1_000_000n,
        [`${servicePolicyId}${refTokenName}`]: 1n,
      })
      .pay.ToAddress(merchantAddress, {
        [`${servicePolicyId}${userTokenName}`]: 1n,
      })
      .validTo(Date.now() + 900000)
      .attach.MintingPolicy(validators.mintServiceValidator)
      .complete({
        coinSelection: false, // Setting to false to avoid using distributor funds
      });
    // const tx = await lucid
    //   .newTx()
    // .collectFrom(feeUTxOs)
    //   .pay.ToContract(
    //     validators.mintServiceValAddress,
    // { kind: "inline", value: directDatum },
    //   )
    //   .complete();

    console.log("data: ", tx);
    return { type: "ok", data: tx };
  } catch (error) {
    console.log("ERROR: ", error);

    if (error instanceof Error) return { type: "error", error: error };
    return { type: "error", error: new Error(`${JSON.stringify(error)}`) };
  }
};

export const createServiceEffect = async (
  lucid: LucidEvolution,
  config: CreateServiceConfig,
): Promise<Effect.Effect<TxSignBuilder, TransactionError, never>> =>
  Effect.gen(function* () { // return type ,
    const merchantAddress = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getServiceMultiValidator(lucid, config.scripts);
    const servicePolicyId = mintingPolicyToId(validators.mintServiceValidator);

    console.log("servicePolicyId in hex: ", servicePolicyId);
    console.log("policyId: " + fromHex(servicePolicyId));

    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(merchantAddress)
    );

    console.log("Merchant UTxO");
    console.log(merchantUTxOs);

    if (!merchantUTxOs || !merchantUTxOs.length) {
      console.error("No UTxO found at user address: " + merchantAddress);
    }

    // Selecting a utxo containing atleast 5 ADA to cover tx fees and min ADA
    // Note: To avoid tx balancing errors, the utxo should only contain lovelaces
    const selectedUTxOs = selectUTxOs(merchantUTxOs, {
      ["lovelace"]: 5000000n,
    });
    const { refTokenName, userTokenName } = createServiceTokens(
      selectedUTxOs[0],
    );

    console.log("refTokenName: ", refTokenName);
    console.log("userTokenName: ", userTokenName);

    const mintingAssets: Assets = {
      [`${servicePolicyId}${refTokenName}`]: 1n,
      [`${servicePolicyId}${userTokenName}`]: 1n,
    };

    // const mintUtxoScriptRef = yield* Effect.fromNullable(
    //   selectedUTxOs.find((utxo) => utxo.scriptRef ?? null),
    // );

    // const selectedMintUTxOs = selectedUTxOs
    //   .filter((utxo) => {
    //     return (
    //       utxo.scriptRef &&
    //       (utxo.txHash !== mintUtxoScriptRef.txHash ||
    //         utxo.outputIndex !== mintUtxoScriptRef.outputIndex)
    //     );
    //   })
    //   .slice(0, 3);

    // Create the redeemer
    const rdmrBuilderMint: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        const redeemer: CreateServiceRedeemer = {
          output_reference: {
            txHash: { hash: selectedUTxOs[0].txHash },
            outputIndex: BigInt(selectedUTxOs[0].outputIndex),
          },
          input_index: inputIndices[0],
        };
        return Data.to(redeemer, CreateServiceRedeemer);
      },
      inputs: [selectedUTxOs[0]],
    };

    // console.log("REDEEMER :: ", redeemer);

    const walletUTxOs = yield* Effect.promise(() => lucid.wallet().getUtxos());

    const feeUTxOs = selectUTxOs(walletUTxOs, { lovelace: BigInt(2_000_000) });

    const tx = yield* lucid
      .newTx()
      .collectFrom(selectedUTxOs)
      .mintAssets(
        mintingAssets,
        rdmrBuilderMint,
      )
      .pay.ToAddress(validators.mintServiceValAddress, {
        [`${servicePolicyId}${refTokenName}`]: 1n,
      })
      .validTo(Date.now() + 900000)
      .attach.MintingPolicy(validators.mintServiceValidator)
      .completeProgram();

    return tx;
  });
