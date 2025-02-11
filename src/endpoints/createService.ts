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
import { CreateServiceConfig } from "../core/types.js";
import { CreateServiceRedeemer, ServiceDatum } from "../core/contract.types.js";
import { createCip68TokenNames } from "../core/utils/assets.js";
import { Effect } from "effect";
import { ADA } from "../core/constants.js";
import { serviceScript } from "../core/validators/constants.js";

export const createServiceProgram = (
  lucid: LucidEvolution,
  config: CreateServiceConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () { // return type ,
    const merchantAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );

    const validators = getMultiValidator(lucid, serviceScript);
    const servicePolicyId = mintingPolicyToId(validators.mintValidator);

    const merchantUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(merchantAddress)
    );

    if (!merchantUTxOs || !merchantUTxOs.length) {
      console.error("No UTxO found at user address: " + merchantAddress);
    }

    // Selecting a utxo containing atleast 2 ADA to cover tx fees and min ADA
    // Note: To avoid tx balancing errors, the utxo should only contain lovelaces
    const selectedUTxOs = selectUTxOs(merchantUTxOs, {
      ["lovelace"]: 2000000n,
    });
    const { refTokenName, userTokenName } = createCip68TokenNames(
      selectedUTxOs[0],
    );

    const createServiceRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        // Construct the redeemer using the input indices
        const merchantIndex = inputIndices[0];

        const redeemer: CreateServiceRedeemer = {
          output_reference: {
            txHash: {
              hash: selectedUTxOs[0].txHash,
            },
            outputIndex: BigInt(selectedUTxOs[0].outputIndex),
          },
          input_index: merchantIndex,
          output_index: 1n,
        };
        const redeemerData = Data.to(redeemer, CreateServiceRedeemer);

        return redeemerData;
      },
      // Specify the inputs relevant to the redeemer
      inputs: [selectedUTxOs[0]],
    };

    const currDatum: ServiceDatum = {
      service_fee_policyid: "",
      service_fee_assetname: "",
      service_fee: config.service_fee,
      penalty_fee_policyid: "",
      penalty_fee_assetname: "",
      penalty_fee: config.penalty_fee,
      interval_length: config.interval_length,
      num_intervals: config.num_intervals,
      is_active: config.is_active,
    };

    const directDatum = Data.to<ServiceDatum>(currDatum, ServiceDatum);

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
        createServiceRedeemer,
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
