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

    const subscriberUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(subscriberAddress)
    );

    if (!subscriberUTxOs || !subscriberUTxOs.length) {
      console.error("No UTxO found at user address: " + subscriberAddress);
    }

    const accountUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(validators.mintValAddress)
    );
    // console.log("Subscriber UTxOs: ", subscriberUTxOs);
    // console.log("Account UTxOs: ", accountUTxOs);

    // Selecting a utxo containing atleast 2 ADA to cover tx fees and min ADA
    // Note: To avoid tx balancing errors, the utxo should only contain lovelaces
    const selectedUTxOs = selectUTxOs(subscriberUTxOs, {
      ["lovelace"]: 2000000n,
    });

    console.log("selectedUTxOs UTxOs: ", selectedUTxOs);

    const { refTokenName, userTokenName } = createCip68TokenNames(
      selectedUTxOs[0],
    );

    const redeemer: CreateAccountRedeemer = {
      output_reference: {
        txHash: {
          hash: selectedUTxOs[0].txHash,
        },
        outputIndex: BigInt(selectedUTxOs[0].outputIndex),
      },
      input_index: BigInt(selectedUTxOs[0].outputIndex),
    };
    const redeemerData = Data.to(redeemer, CreateAccountRedeemer);

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

    const userToken = toUnit(
      accountPolicyId,
      userTokenName,
    );

    const mintingAssets: Assets = {
      [refToken]: 1n,
      [userToken]: 1n,
    };

    console.log(`accountPolicyId: ${accountPolicyId}`);
    console.log(`refToken: ${refToken}`);
    console.log(`userToken: ${userToken}`);
    console.log(`mintingAssets: ${mintingAssets}`);

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
