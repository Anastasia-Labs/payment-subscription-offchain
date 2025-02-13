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
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { CreateAccountConfig } from "../core/types.js";
import { AccountDatum, CreateAccountRedeemer } from "../core/contract.types.js";
import { createCip68TokenNames } from "../core/utils/assets.js";
import { Effect } from "effect";
import { accountScript } from "../core/validators/constants.js";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

export const createAccountProgram = (
  lucid: LucidEvolution,
  config: CreateAccountConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
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

    const selectedUTxOs = selectUTxOs(subscriberUTxOs, {
      ["lovelace"]: 2000000n,
    });

    const selectedUTxO = selectedUTxOs[0]
    const { refTokenName, userTokenName } = createCip68TokenNames(selectedUTxO);

    const createAccountRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        return Data.to(new Constr(0, [inputIndices[0], 1n]));
      },
      inputs: [selectedUTxO],
    };

    const currDatum: AccountDatum = {
      email_hash: bytesToHex(sha256(config.email_hash)),
      phone_hash: bytesToHex(sha256(config.phone_hash)),
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
      .collectFrom([selectedUTxO])
      .mintAssets(mintingAssets, createAccountRedeemer)
      .pay.ToAddress(subscriberAddress, { [userToken]: 1n, })
      .pay.ToContract(validators.mintValAddress, {
        kind: "inline",
        value: directDatum,
      }, { [refToken]: 1n, })
      .attach.MintingPolicy(validators.mintValidator)
      .completeProgram({ localUPLCEval: true });

    return tx;
  });
