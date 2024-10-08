import {
    Address,
    Assets,
    Constr,
    Data,
    LucidEvolution,
    TransactionError,
    TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { RemoveAccountConfig } from "../core/types.js";
import { Effect } from "effect";

export const removeAccount = (
    lucid: LucidEvolution,
    config: RemoveAccountConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () { // return type ,
        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );

        const validators = getMultiValidator(lucid, config.scripts);

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

        const mintingAssets: Assets = {
            [config.ref_token]: -1n,
            [config.user_token]: -1n,
        };

        if (!accountUTxO || !accountUTxO.length) {
            console.error(
                "No UTxO found at user address: " + subscriberAddress,
            );
        }

        const deleteAccRedeemer = Data.to(new Constr(1, [])); // Assuming DeleteAccount is index 1 in your MintAccount enum
        const removeAccRedeemer = Data.to(new Constr(1, [new Constr(1, [])])); // Wrapped redeemer for multi-validator spend endpoint

        const tx = yield* lucid
            .newTx()
            .collectFrom(subscriberUTxO)
            .collectFrom(accountUTxO, removeAccRedeemer)
            .mintAssets(
                mintingAssets,
                deleteAccRedeemer,
            )
            .attach.MintingPolicy(validators.mintValidator)
            .attach.SpendingValidator(validators.spendValidator)
            .completeProgram();

        return tx;
    });
