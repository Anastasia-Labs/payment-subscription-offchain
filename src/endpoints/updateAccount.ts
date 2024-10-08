import {
    Address,
    Constr,
    Data,
    fromText,
    LucidEvolution,
    TransactionError,
    TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { UpdateAccountConfig } from "../core/types.js";
import { AccountDatum } from "../core/contract.types.js";
import { Effect } from "effect";

export const updateAccount = (
    lucid: LucidEvolution,
    config: UpdateAccountConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () { // return type ,
        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const validators = getMultiValidator(lucid, config.scripts);

        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(subscriberAddress)
        );

        if (!subscriberUTxOs || !subscriberUTxOs.length) {
            console.error(
                "No UTxO found at user address: " + subscriberAddress,
            );
        }

        const accountUTxO = yield* Effect.promise(() =>
            lucid.utxosAtWithUnit(
                validators.spendValAddress,
                config.ref_token,
            )
        );

        const subscriberUTxO = yield* Effect.promise(() =>
            lucid.utxosAtWithUnit(
                subscriberAddress,
                config.user_token,
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
                [config.user_token]: 1n,
            })
            .pay.ToContract(validators.spendValAddress, {
                kind: "inline",
                value: directDatum,
            }, {
                [config.ref_token]: 1n,
            })
            .attach.SpendingValidator(validators.spendValidator)
            .completeProgram();
        return tx;
    });
