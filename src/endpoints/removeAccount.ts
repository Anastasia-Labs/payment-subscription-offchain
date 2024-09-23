import {
    Address,
    Assets,
    Constr,
    Data,
    fromText,
    LucidEvolution,
    mintingPolicyToId,
    SpendingValidator,
    toUnit,
    TransactionError,
    TxSignBuilder,
    validatorToAddress,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { RemoveAccountConfig } from "../core/types.js";
import { Effect } from "effect";
import {
    AccountDatum,
    CreateAccountRedeemer,
    CreateServiceRedeemer,
} from "../core/contract.types.js";

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
        const accountPolicyId = mintingPolicyToId(
            validators.mintValidator,
        );

        const refToken = toUnit(
            accountPolicyId,
            "000643b0009e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db71",
        );

        const userToken = toUnit(
            accountPolicyId,
            "000de140009e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db71",
        );

        const accountUTxO = yield* Effect.promise(() =>
            lucid.utxosAtWithUnit(
                validators.spendValAddress,
                refToken,
            )
        );

        console.log("Account UTxO: ", accountUTxO);
        const mintingAssets: Assets = {
            [refToken]: -1n,
            [userToken]: -1n,
        };

        const subscriberUTxO = yield* Effect.promise(() =>
            lucid.utxosAtWithUnit(
                subscriberAddress,
                userToken,
            )
        );

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

        const redeemer: CreateAccountRedeemer = {
            output_reference: {
                txHash: {
                    hash: subscriberUTxO[0].txHash,
                },
                outputIndex: BigInt(subscriberUTxO[0].outputIndex),
            },
            input_index: 0n,
        };
        const mintRedeemer = Data.to(redeemer, CreateServiceRedeemer);

        // const removeAccountRedeemer = Data.to(new Constr(1, [])); // Assuming DeleteAccount is index 1 in your MintAccount enum
        const wrappedRedeemer = Data.to(new Constr(1, [new Constr(1, [])]));

        const tx = yield* lucid
            .newTx()
            .collectFrom(subscriberUTxO)
            .collectFrom(accountUTxO, wrappedRedeemer)
            .mintAssets(
                mintingAssets,
                mintRedeemer,
            )
            .attach.SpendingValidator(validators.spendValidator)
            .attach.MintingPolicy(validators.mintValidator)
            .completeProgram();

        return tx;
    });
