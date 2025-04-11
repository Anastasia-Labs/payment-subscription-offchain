import {
    Constr,
    Data,
    LucidEvolution,
    RedeemerBuilder,
    toUnit,
    TransactionError,
    TxSignBuilder,
} from "@lucid-evolution/lucid"
import { getMultiValidator } from "../core/utils/index.js"
import { UpdateAccountConfig } from "../core/types.js"
import { AccountDatum } from "../core/contract.types.js"
import { Effect } from "effect"
import {
    accountPolicyId,
    accountScript,
} from "../core/validators/constants.js"
import { sha256 } from "@noble/hashes/sha256"
import { bytesToHex } from "@noble/hashes/utils"

export const updateAccountProgram = (
    lucid: LucidEvolution,
    config: UpdateAccountConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () {
        const validators = getMultiValidator(lucid, accountScript)

        const accountNFT = toUnit(accountPolicyId, config.account_nft_tn)
        const subscriberNFT = toUnit(accountPolicyId, config.subscriber_nft_tn)

        const accountUTxO = yield* Effect.promise(() => lucid.utxoByUnit(accountNFT))
        const subscriberUTxO = yield* Effect.promise(() => lucid.utxoByUnit(subscriberNFT))

        if (!accountUTxO) {
            throw new Error("Account NFT not found")
        }
        
        
        const updatedDatum: AccountDatum = {
            email_hash: bytesToHex(sha256(config.new_email)),
            phone_hash: bytesToHex(sha256(config.new_phone)),
        }

        const directDatum = Data.to<AccountDatum>(updatedDatum, AccountDatum)

        const updateAccountRedeemer: RedeemerBuilder = {
            kind: "selected",
            makeRedeemer: (inputIndices: bigint[]) => {
                return Data.to(new Constr(0, [config.account_nft_tn, inputIndices[0], inputIndices[1], 0n]),
                )
            },
            inputs: [subscriberUTxO, accountUTxO],
        }

        const tx = yield* lucid
            .newTx()
            .collectFrom([subscriberUTxO])
            .collectFrom([accountUTxO], updateAccountRedeemer)
            .pay.ToContract(validators.spendValAddress, {
                kind: "inline",
                value: directDatum,
            }, {
                [accountNFT]: 1n,
            })
            .attach.SpendingValidator(validators.spendValidator)
            .completeProgram()
        return tx
    })
