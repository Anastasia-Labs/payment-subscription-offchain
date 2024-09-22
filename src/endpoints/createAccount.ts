import {
  Address,
  Assets,
  Constr,
  Data,
  fromText,
  LucidEvolution,
  mintingPolicyToId,
  toUnit,
  TransactionError,
  TxSignBuilder,
  UTxO,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { CreateAccountConfig } from "../core/types.js";
import {
  AccountDatum,
  CreateAccountRedeemer,
  CreateServiceRedeemer,
} from "../core/contract.types.js";
import {
  assetNameLabels,
  generateUniqueAssetName,
} from "../core/utils/assets.js";
import { Effect } from "effect";

const createAccountTokens = (utxo: UTxO) => {
  const refTokenName = generateUniqueAssetName(utxo, assetNameLabels.prefix100);
  const userTokenName = generateUniqueAssetName(
    utxo,
    assetNameLabels.prefix222,
  );
  return { refTokenName, userTokenName };
};

export const createAccount = (
  lucid: LucidEvolution,
  config: CreateAccountConfig,
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
    ); // const contractUTxOs = await lucid.utxosAt(validators.mintServiceValAddress);
    // const mintUtxoScriptRef = contractUTxOs.find((utxo) =>
    //   utxo.scriptRef ?? null
    // );

    if (!merchantUTxOs || !merchantUTxOs.length) {
      console.error("No UTxO found at user address: " + merchantAddress);
    }

    // Selecting a utxo containing atleast 5 ADA to cover tx fees and min ADA
    // Note: To avoid tx balancing errors, the utxo should only contain lovelaces
    // const selectedUTxOs = selectUTxOs(merchantUTxOs, { ["lovelace"]: 5000000n });
    const { refTokenName, userTokenName } = createAccountTokens(
      merchantUTxOs[0],
    );
    console.log("refTokenName: ", refTokenName);
    console.log("userTokenName: ", userTokenName);

    // Create the redeemer
    // const rdmrBuilderMint: RedeemerBuilder = {
    //   kind: "selected",
    //   makeRedeemer: (inputIndices: bigint[]) => {
    //     const redeemer: CreateServiceRedeemer = {
    //       output_reference: {
    //         txHash: { hash: merchantUTxOs[0].txHash },
    //         outputIndex: BigInt(merchantUTxOs[0].outputIndex),
    //       },
    //       input_index: inputIndices[0],
    //     };
    //     return Data.to(redeemer, CreateServiceRedeemer);
    //   },
    //   inputs: [merchantUTxOs[0]],
    // };

    const redeemer: CreateAccountRedeemer = {
      output_reference: {
        txHash: {
          hash: merchantUTxOs[0].txHash,
        },
        outputIndex: BigInt(merchantUTxOs[0].outputIndex),
      },
      input_index: BigInt(merchantUTxOs[0].outputIndex),
    };
    const redeemerData = Data.to(redeemer, CreateServiceRedeemer);

    const accountRedeemer = Data.to(
      new Constr(0, [redeemerData]),
    );

    const currDatum: AccountDatum = {
      email: fromText(config.email),
      phone: fromText(config.phone),
      account_created: config.account_created,
    };

    const directDatum = Data.to<AccountDatum>(currDatum, AccountDatum);

    console.log("merchantUTxOs :: ", merchantUTxOs);

    const refToken = toUnit(
      servicePolicyId,
      refTokenName,
    );

    const userToken = toUnit(
      servicePolicyId,
      refTokenName,
    );

    const mintingAssets: Assets = {
      [refToken]: 1n,
      [userToken]: 1n,
    };

    const tx = yield* lucid
      .newTx()
      .collectFrom(merchantUTxOs)
      .mintAssets(
        mintingAssets,
        redeemerData,
      )
      .pay.ToAddress(merchantAddress, {
        lovelace: 1_000_000n,
        [`${servicePolicyId}${userTokenName}`]: 1n,
      })
      .pay.ToContract(validators.mintValAddress, {
        kind: "inline",
        value: directDatum,
      }, {
        lovelace: 1_000_000n,
        [`${servicePolicyId}${refTokenName}`]: 1n,
      })
      .validTo(Date.now() + 900000)
      .attach.MintingPolicy(validators.mintValidator)
      .completeProgram();

    return tx;
  });
