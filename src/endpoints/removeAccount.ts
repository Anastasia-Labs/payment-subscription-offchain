import {
    Address,
    Assets,
    Constr,
    Data,
    fromText,
    LucidEvolution,
    TransactionError,
    TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { RemoveAccountConfig } from "../core/types.js";
import { Effect } from "effect";
import { AccountDatum, CreateAccountRedeemer } from "../core/contract.types.js";

export const removeAccount = (
    lucid: LucidEvolution,
    config: RemoveAccountConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () { // return type ,
        console.log("removeAccount..........: ");
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

        console.log("Account UTxO: ", accountUTxO);
        const mintingAssets: Assets = {
            [config.ref_token]: -1n,
            [config.user_token]: -1n,
        };

        if (!accountUTxO || !accountUTxO.length) {
            console.error(
                "No UTxO found at user address: " + subscriberAddress,
            );
        }

        const accountDatum: AccountDatum = {
            email: fromText(config.email),
            phone: fromText(config.phone),
            account_created: BigInt(config.account_created),
        };

        const directDatum = Data.to<AccountDatum>(accountDatum, AccountDatum);

        // const redeemer: CreateAccountRedeemer = {
        //     output_reference: {
        //         txHash: {
        //             hash: subscriberUTxO[0].txHash,
        //         },
        //         outputIndex: BigInt(subscriberUTxO[0].outputIndex),
        //     },
        //     input_index: 0n,
        // };
        // const mintRedeemer = Data.to(redeemer, CreateAccountRedeemer);

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
