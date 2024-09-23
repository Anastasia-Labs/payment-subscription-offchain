import {
  Address,
  Assets,
  Data,
  LucidEvolution,
  mintingPolicyToId,
  RedeemerBuilder,
  selectUTxOs,
  toUnit,
  TransactionError,
  TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { CreateServiceConfig, Result } from "../core/types.js";
import { CreateServiceRedeemer, ServiceDatum } from "../core/contract.types.js";
import { createCip68TokenNames } from "../core/utils/assets.js";
import { Effect } from "effect";
import { ADA } from "../core/constants.js";

export const createService = (
  lucid: LucidEvolution,
  config: CreateServiceConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () { // return type ,
    const merchantAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getMultiValidator(lucid, config.scripts);
    const servicePolicyId = mintingPolicyToId(validators.mintValidator);

    console.log("servicePolicyId: ", servicePolicyId);

    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(merchantAddress)
    );

    if (!merchantUTxOs || !merchantUTxOs.length) {
      console.error("No UTxO found at user address: " + merchantAddress);
    }

    // Selecting a utxo containing atleast 5 ADA to cover tx fees and min ADA
    // Note: To avoid tx balancing errors, the utxo should only contain lovelaces
    const selectedUTxOs = selectUTxOs(merchantUTxOs, {
      ["lovelace"]: 5000000n,
    });
    const { refTokenName, userTokenName } = createCip68TokenNames(
      selectedUTxOs[0],
    );
    console.log("refTokenName: ", refTokenName);
    console.log("userTokenName: ", userTokenName);

    // Create the redeemer
    // const rdmrBuilderMint: RedeemerBuilder = {
    //   kind: "selected",
    //   makeRedeemer: (inputIndices: bigint[]) => {
    //     const redeemer: CreateServiceRedeemer = {
    //       output_reference: {
    //         txHash: { hash: selectedUTxOs[0].txHash },
    //         outputIndex: BigInt(selectedUTxOs[0].outputIndex),
    //       },
    //       input_index: inputIndices[0],
    //     };
    //     return Data.to(redeemer, CreateServiceRedeemer);
    //   },
    //   inputs: [selectedUTxOs[0]],
    // };

    const redeemer: CreateServiceRedeemer = {
      output_reference: {
        txHash: {
          hash: selectedUTxOs[0].txHash,
        },
        outputIndex: BigInt(selectedUTxOs[0].outputIndex),
      },
      input_index: 0n,
    };
    const redeemerData = Data.to(redeemer, CreateServiceRedeemer);

    const currDatum: ServiceDatum = {
      service_fee: ADA,
      service_fee_qty: 10_000_000n,
      penalty_fee: ADA,
      penalty_fee_qty: 1_000_000n,
      interval_length: 1n,
      num_intervals: 12n,
      minimum_ada: 2_000_000n,
      is_active: true,
    };

    const directDatum = Data.to<ServiceDatum>(currDatum, ServiceDatum);

    console.log("Merchant UTxOs :: ", selectedUTxOs);

    const refToken = toUnit(
      servicePolicyId,
      refTokenName,
    );

    const userToken = toUnit(
      servicePolicyId,
      userTokenName,
    );

    const mintingAssets: Assets = {
      [refToken]: 1n,
      [userToken]: 1n,
    };

    const tx = yield* lucid
      .newTx()
      .collectFrom(selectedUTxOs)
      .mintAssets(
        mintingAssets,
        redeemerData,
      )
      .pay.ToAddress(merchantAddress, {
        [userToken]: 1n,
      })
      .pay.ToContract(validators.mintValAddress, {
        kind: "inline",
        value: directDatum,
      }, {
        [refToken]: 1n,
      })
      .attach.MintingPolicy(validators.mintValidator)
      .completeProgram();

    return tx;
  });
