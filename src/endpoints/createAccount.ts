import {
  Address,
  Assets,
  Constr,
  Data,
  LucidEvolution,
  mintingPolicyToId,
  RedeemerBuilder,
  toUnit,
  TransactionError,
  TxSignBuilder,
} from "@lucid-evolution/lucid"
import { getMultiValidator } from "../core/utils/index.js"
import { CreateAccountConfig } from "../core/types.js"
import { AccountDatum } from "../core/contract.types.js"
import { createCip68TokenNames } from "../core/utils/assets.js"
import { Effect } from "effect"
import { accountScript } from "../core/validators/constants.js"
import { sha256 } from "@noble/hashes/sha256"
import { bytesToHex } from "@noble/hashes/utils"

export const createAccountProgram = (
  lucid: LucidEvolution,
  config: CreateAccountConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
    const validators = getMultiValidator(lucid, accountScript)
    const accountPolicyId = mintingPolicyToId(validators.mintValidator)
    
    const subscriberAddress: Address = yield* Effect.promise(() => lucid.wallet().address())
    const selectedUTxOs = yield* Effect.promise(() => lucid.utxosByOutRef([config.selected_out_ref]))

    if (!selectedUTxOs || !selectedUTxOs.length) {
      console.error("UTxO (" + config.selected_out_ref + ") not found!")
    }

    const selectedUTxO = selectedUTxOs[0]
    const { refTokenName, userTokenName } = createCip68TokenNames(selectedUTxO)

    const createAccountRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        return Data.to(new Constr(0, [inputIndices[0], 1n]))
      },
      inputs: [selectedUTxO],
    }

    const currDatum: AccountDatum = {
      email_hash: bytesToHex(sha256(config.email)),
      phone_hash: bytesToHex(sha256(config.phone)),
    }

    const directDatum = Data.to<AccountDatum>(currDatum, AccountDatum)

    const refToken = toUnit(accountPolicyId, refTokenName)
    const userToken = toUnit(accountPolicyId, userTokenName)

    const mintingAssets: Assets = {
      [refToken]: 1n,
      [userToken]: 1n,
    }

    const tx = yield* lucid
      .newTx()
      .collectFrom([selectedUTxO])
      .mintAssets(mintingAssets, createAccountRedeemer)
      .pay.ToAddress(subscriberAddress, { [userToken]: 1n, })
      .pay.ToContract(validators.mintValAddress, {
        kind: "inline",
        value: directDatum,
      }, { [refToken]: 1n })
      .attach.MintingPolicy(validators.mintValidator)
      .completeProgram()

    return tx
  })
