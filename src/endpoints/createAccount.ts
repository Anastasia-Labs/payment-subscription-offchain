import {
  Address,
  Assets,
  Data,
  fromText,
  LucidEvolution,
  mintingPolicyToId,
  RedeemerBuilder,
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
import { accountScript } from "../core/validators/constants.js";

export const createAccountProgram = (
  lucid: LucidEvolution,
  config: CreateAccountConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () { // return type ,
    const subscriberAddress: Address = yield* Effect.promise(() =>
      lucid.wallet().address()
    );
    const validators = getMultiValidator(lucid, accountScript);
    const accountPolicyId = mintingPolicyToId(validators.mintValidator);

    const subscriberUTxOs = yield* Effect.promise(() =>
      lucid.utxosAt(subscriberAddress)
    );

    if (!subscriberUTxOs || !subscriberUTxOs.length) {
      console.error("No UTxO found at user address: " + subscriberAddress);
    }

    // Selecting a utxo containing atleast 2 ADA to cover tx fees and min ADA
    // Note: To avoid tx balancing errors, the utxo should only contain lovelaces
    const selectedUTxOs = selectUTxOs(subscriberUTxOs, {
      ["lovelace"]: 2000000n,
    });

    const { refTokenName, userTokenName } = createCip68TokenNames(
      selectedUTxOs[0],
    );

    const createAccountRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        // Construct the redeemer using the input indices
        const subscriberIndex = inputIndices[0];

        const redeemer: CreateAccountRedeemer = {
          output_reference: {
            txHash: {
              hash: selectedUTxOs[0].txHash,
            },
            outputIndex: BigInt(selectedUTxOs[0].outputIndex),
          },
          input_index: subscriberIndex,
        };
        const redeemerData = Data.to(redeemer, CreateAccountRedeemer);

        return redeemerData;
      },
      // Specify the inputs relevant to the redeemer
      inputs: [selectedUTxOs[0]],
    };

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

    const tx = yield* lucid
      .newTx()
      .collectFrom(selectedUTxOs)
      .mintAssets(
        mintingAssets,
        createAccountRedeemer,
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
