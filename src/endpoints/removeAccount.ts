import {
    Address,
    Assets,
    Constr,
    Data,
    LucidEvolution,
    mintingPolicyToId,
    TransactionError,
    TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { RemoveAccountConfig } from "../core/types.js";
import { Effect } from "effect";
import { extractTokens } from "./utils.js";

export const removeAccount = (
    lucid: LucidEvolution,
    config: RemoveAccountConfig,
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

        let { user_token, ref_token } = extractTokens(
            accountPolicyId,
            accountUTxOs,
            subscriberUTxOs,
        );

        // const accountUTxOs = yield* Effect.promise(() =>
        //     lucid.utxosAtWithUnit(
        //         validators.spendValAddress,
        //         config.ref_token,
        //     )
        // );

        // const subscriberUTxOs = yield* Effect.promise(() =>
        //     lucid.utxosAtWithUnit(
        //         subscriberAddress,
        //         config.user_token,
        //     )
        // );

        const mintingAssets: Assets = {
            [ref_token]: -1n,
            [user_token]: -1n,
        };

        if (!accountUTxOs || !accountUTxOs.length) {
            console.error(
                "No UTxO found at user address: " + validators.spendValAddress,
            );
        }
        console.log("subscriberUTxOs: ", subscriberUTxOs);
        console.log("accountUTxOs: ", accountUTxOs[0]);
        console.log("user_token: ", user_token);
        console.log("ref_token: ", ref_token);

        const deleteAccRedeemer = Data.to(new Constr(1, [])); // Assuming DeleteAccount is index 1 in your MintAccount enum
        const removeAccRedeemer = Data.to(new Constr(1, [new Constr(1, [])])); // Wrapped redeemer for multi-validator spend endpoint

        const tx = yield* lucid
            .newTx()
            .collectFrom(subscriberUTxOs)
            .collectFrom(accountUTxOs, removeAccRedeemer)
            .mintAssets(
                mintingAssets,
                deleteAccRedeemer,
            )
            .attach.MintingPolicy(validators.mintValidator)
            .attach.SpendingValidator(validators.spendValidator)
            .completeProgram();

        return tx;
    });
