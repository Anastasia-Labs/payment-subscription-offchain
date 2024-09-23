import {
  Address,
  Assets,
  Data,
  fromText,
  LucidEvolution,
  mintingPolicyToId,
  selectUTxOs,
  toUnit,
  TransactionError,
  TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { CreateAccountConfig } from "../core/types.js";
import { AccountDatum, CreateAccountRedeemer } from "../core/contract.types.js";
import { createCip68TokenNames } from "../core/utils/assets.js";
import { Effect } from "effect";

export const createAccount = (
  lucid: LucidEvolution,
  config: CreateAccountConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () { // return type ,
    const subscriberAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );
    const validators = getMultiValidator(lucid, config.scripts);
    const accountPolicyId = mintingPolicyToId(validators.mintValidator);

    console.log("accountPolicyId: ", accountPolicyId);

    const subscriberUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(subscriberAddress)
    );

    if (!subscriberUTxOs || !subscriberUTxOs.length) {
      console.error("No UTxO found at user address: " + subscriberAddress);
    }

    // Selecting a utxo containing atleast 5 ADA to cover tx fees and min ADA
    // Note: To avoid tx balancing errors, the utxo should only contain lovelaces
    const selectedUTxOs = selectUTxOs(subscriberUTxOs, {
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
    //     const redeemer: CreateaccountRedeemer = {
    //       output_reference: {
    //         txHash: { hash: subscriberUTxOs[0].txHash },
    //         outputIndex: BigInt(subscriberUTxOs[0].outputIndex),
    //       },
    //       input_index: inputIndices[0],
    //     };
    //     return Data.to(redeemer, CreateaccountRedeemer);
    //   },
    //   inputs: [subscriberUTxOs[0]],
    // };

    const redeemer: CreateAccountRedeemer = {
      output_reference: {
        txHash: {
          hash: subscriberUTxOs[0].txHash,
        },
        outputIndex: BigInt(subscriberUTxOs[0].outputIndex),
      },
      input_index: BigInt(subscriberUTxOs[0].outputIndex),
    };
    const redeemerData = Data.to(redeemer, CreateAccountRedeemer);

    const currDatum: AccountDatum = {
      email: fromText(config.email),
      phone: fromText(config.phone),
      account_created: config.account_created,
    };

    const directDatum = Data.to<AccountDatum>(currDatum, AccountDatum);

    console.log("subscriberUTxOs :: ", subscriberUTxOs);

    const refToken = toUnit(
      accountPolicyId,
      refTokenName,
    );

    const userToken = toUnit(
      accountPolicyId,
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
      .pay.ToAddress(subscriberAddress, {
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
