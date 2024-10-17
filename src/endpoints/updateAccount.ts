import {
    Address,
    Constr,
    Data,
    fromText,
    LucidEvolution,
    mintingPolicyToId,
    TransactionError,
    TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { UpdateAccountConfig } from "../core/types.js";
import { AccountDatum } from "../core/contract.types.js";
import { Effect } from "effect";
import { extractTokens } from "./utils.js";

export const updateAccount = (
    lucid: LucidEvolution,
    config: UpdateAccountConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () { // return type ,
        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const validators = getMultiValidator(lucid, config.scripts);
        const accountPolicyId = mintingPolicyToId(validators.mintValidator);

        const accountUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(validators.mintValAddress)
        );

        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(subscriberAddress)
        );

        if (!subscriberUTxOs || !subscriberUTxOs.length) {
            console.error(
                "No UTxO found at user address: " + subscriberAddress,
            );
        }

        let { user_token, ref_token } = extractTokens(
            accountPolicyId,
            accountUTxOs,
            subscriberUTxOs,
        );

        const accountUTxO = yield* Effect.promise(() =>
            lucid.utxosAtWithUnit(
                validators.spendValAddress,
                ref_token,
            )
        );

        const subscriberUTxO = yield* Effect.promise(() =>
            lucid.utxosAtWithUnit(
                subscriberAddress,
                user_token,
            )
        );

        if (!accountUTxO) {
            throw new Error("Account NFT not found");
        }

        const updatedDatum: AccountDatum = {
            email: fromText(config.new_email),
            phone: fromText(config.new_phone),
            account_created: BigInt(config.account_created),
        };

        const directDatum = Data.to<AccountDatum>(updatedDatum, AccountDatum);

        const wrappedRedeemer = Data.to(new Constr(1, [new Constr(0, [])]));

        const tx = yield* lucid
            .newTx()
            .collectFrom(subscriberUTxO)
            .collectFrom(accountUTxO, wrappedRedeemer)
            .pay.ToAddress(subscriberAddress, {
                [user_token]: 1n,
            })
            .pay.ToContract(validators.spendValAddress, {
                kind: "inline",
                value: directDatum,
            }, {
                [ref_token]: 1n,
            })
            .attach.SpendingValidator(validators.spendValidator)
            .completeProgram();
        return tx;
    });
