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
import { CreateServiceConfig } from "../core/types.js"
import { ServiceDatum } from "../core/contract.types.js"
import { createCip68TokenNames } from "../core/utils/assets.js"
import { Effect } from "effect"
import { serviceScript } from "../core/validators/constants.js"

export const createServiceProgram = (
  lucid: LucidEvolution,
  config: CreateServiceConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
  Effect.gen(function* () {
    const validators = getMultiValidator(lucid, serviceScript)
    const servicePolicyId = mintingPolicyToId(validators.mintValidator)

    const merchantAddress: Address = yield* Effect.promise(() => lucid.wallet().address())
    const selectedUTxOs = yield* Effect.promise(() => lucid.utxosByOutRef([config.selected_out_ref]))
    if (!selectedUTxOs || !selectedUTxOs.length) {
      console.error("UTxO (" + config.selected_out_ref + ") not found!")
    }
    const selectedUTxO = selectedUTxOs[0]
    const { refTokenName, userTokenName } = createCip68TokenNames(selectedUTxO)

    const createServiceRedeemer: RedeemerBuilder = {
      kind: "selected",
      makeRedeemer: (inputIndices: bigint[]) => {
        return Data.to(new Constr(0, [inputIndices[0], 1n]))
      },
      inputs: [selectedUTxO],
    }

    const currDatum: ServiceDatum = {
      service_fee_policyid: config.service_fee_policyid,
      service_fee_assetname: config.service_fee_assetname,
      service_fee: config.service_fee,
      penalty_fee_policyid: config.penalty_fee_policyid,
      penalty_fee_assetname: config.penalty_fee_assetname,
      penalty_fee: config.penalty_fee,
      interval_length: config.interval_length,
      num_intervals: config.num_intervals,
      is_active: config.is_active,
    }

    const directDatum = Data.to<ServiceDatum>(currDatum, ServiceDatum)

    const refToken = toUnit(servicePolicyId, refTokenName)
    const userToken = toUnit(servicePolicyId, userTokenName)

    const mintingAssets: Assets = {
      [refToken]: 1n,
      [userToken]: 1n,
    }

    const tx = yield* lucid
      .newTx()
      .collectFrom([selectedUTxO])
      .mintAssets(mintingAssets, createServiceRedeemer)
      .pay.ToAddress(merchantAddress, { [userToken]: 1n })
      .pay.ToContract(validators.mintValAddress, {
        kind: "inline",
        value: directDatum,
      }, { [refToken]: 1n })
      .attach.MintingPolicy(validators.mintValidator)
      .completeProgram()

    return tx
  })
