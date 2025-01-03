import {
    Address,
    Constr,
    Data,
    fromText,
    LucidEvolution,
    RedeemerBuilder,
    toUnit,
    TransactionError,
    TxSignBuilder,
} from "@lucid-evolution/lucid";
import { findCip68TokenNames, getMultiValidator } from "../core/utils/index.js";
import { UpdateAccountConfig } from "../core/types.js";
import { AccountDatum } from "../core/contract.types.js";
import { Effect } from "effect";
import { getAccountValidatorDatum } from "./utils.js";
import {
    accountPolicyId,
    accountScript,
} from "../core/validators/constants.js";

export const updateAccountProgram = (
    lucid: LucidEvolution,
    config: UpdateAccountConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () {
        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const validators = getMultiValidator(lucid, accountScript);

        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(subscriberAddress)
        );

        console.log("subscriberUTxO", subscriberUTxOs);

        const accountNFT = toUnit(
            accountPolicyId,
            config.account_nft_tn,
        );

        const subscriberNFT = toUnit(
            accountPolicyId,
            config.subscriber_nft_tn,
        );

        if (!subscriberUTxOs || !subscriberUTxOs.length) {
            console.error(
                "No UTxO found at user address: " + subscriberAddress,
            );
        }

        const accountUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                accountNFT,
            )
        );

        const subscriberUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                subscriberNFT,
            )
        );

        if (!accountUTxO) {
            throw new Error("Account NFT not found");
        }

        const accountData = yield* Effect.promise(
            () => (getAccountValidatorDatum([accountUTxO])),
        );

        const updatedDatum: AccountDatum = {
            email: fromText(config.new_email),
            phone: fromText(config.new_phone),
            account_created: accountData[0].account_created,
        };

        const directDatum = Data.to<AccountDatum>(updatedDatum, AccountDatum);

        const updateAccountRedeemer: RedeemerBuilder = {
            kind: "selected",
            makeRedeemer: (inputIndices: bigint[]) => {
                // Construct the redeemer using the input indices
                const userIndex = inputIndices[0];
                const accountIndex = inputIndices[1];

                return Data.to(
                    new Constr(1, [
                        new Constr(0, [
                            BigInt(userIndex),
                            BigInt(accountIndex),
                        ]),
                    ]),
                );
            },
            // Specify the inputs relevant to the redeemer
            inputs: [subscriberUTxO, accountUTxO],
        };

        const tx = yield* lucid
            .newTx()
            .collectFrom(subscriberUTxOs)
            .collectFrom([accountUTxO], updateAccountRedeemer)
            .pay.ToAddress(subscriberAddress, {
                [subscriberNFT]: 1n,
            })
            .pay.ToContract(validators.spendValAddress, {
                kind: "inline",
                value: directDatum,
            }, {
                [accountNFT]: 1n,
            })
            .attach.SpendingValidator(validators.spendValidator)
            .completeProgram();
        return tx;
    });
