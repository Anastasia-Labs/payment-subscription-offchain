import {
    Address,
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
import { Result, UpdateAccountConfig } from "../core/types.js";
import { AccountDatum } from "../core/contract.types.js";
import { Effect } from "effect";

export const updateAccount = (
    lucid: LucidEvolution,
    config: UpdateAccountConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () { // return type ,
        console.log("updateAccount..........: ");
        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );

        const validators = getMultiValidator(lucid, config.scripts);
        const AccountPolicyId = mintingPolicyToId(
            validators.mintValidator,
        );

        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(subscriberAddress)
        );

        if (!subscriberUTxOs || !subscriberUTxOs.length) {
            console.error(
                "No UTxO found at user address: " + subscriberAddress,
            );
        }

        const refToken = toUnit(
            AccountPolicyId,
            "000643b09e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db7199",
        );

        const userNft = toUnit(
            AccountPolicyId,
            "000de1409e6291970cb44dd94008c79bcaf9d86f18b4b49ba5b2a04781db7199",
        );

        const AccountUTxO = yield* Effect.promise(() =>
            lucid.utxosAtWithUnit(
                validators.spendValAddress,
                refToken,
            )
        );

        const subscriberUTxO = yield* Effect.promise(() =>
            lucid.utxosAtWithUnit(
                subscriberAddress,
                userNft,
            )
        );

        if (!AccountUTxO) {
            throw new Error("Account NFT not found");
        }
        console.log("AccountNFTUTxO: ", AccountUTxO);

        const updatedDatum: AccountDatum = {
            email: fromText(config.new_email),
            phone: fromText(config.new_phone),
            account_created: BigInt(config.account_created),
        };

        const directDatum = Data.to<AccountDatum>(updatedDatum, AccountDatum);

        const wrappedRedeemer = Data.to(new Constr(1, [new Constr(0, [])]));

        console.log("Redeemer updateAccount: ", wrappedRedeemer);
        console.log("Datum AccountDatum: ", directDatum);
        console.log("Datum Account_fee_qty: ", config.new_email);

        const tx = yield* lucid
            .newTx()
            .collectFrom(subscriberUTxO)
            .collectFrom(AccountUTxO, wrappedRedeemer)
            .pay.ToAddress(subscriberAddress, {
                lovelace: 3_000_000n,
                [userNft]: 1n,
            })
            .pay.ToContract(validators.spendValAddress, {
                kind: "inline",
                value: directDatum,
            }, {
                lovelace: 3_000_000n,
                [refToken]: 1n,
            })
            .attach.SpendingValidator(validators.spendValidator)
            .completeProgram();
        return tx;
    });
