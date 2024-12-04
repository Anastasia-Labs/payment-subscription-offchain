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
import { getMultiValidator } from "../core/utils/index.js";
import { UpdateAccountConfig } from "../core/types.js";
import { AccountDatum } from "../core/contract.types.js";
import { Effect } from "effect";
import { getAccountValidatorDatum } from "./utils.js";

export const updateAccount = (
    lucid: LucidEvolution,
    config: UpdateAccountConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () {
        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );
        const validators = getMultiValidator(lucid, config.scripts);

        const accountUTxOs = yield* Effect.promise(() =>
            lucid.config().provider.getUtxos(validators.spendValAddress)
        );

        const accountNFT = toUnit(
            config.account_policy_Id,
            config.account_ref_name, //tokenNameWithoutFunc,
        );

        const subscriberNFT = toUnit(
            config.account_policy_Id,
            config.account_usr_name, //tokenNameWithoutFunc,
        );

        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(subscriberAddress)
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
            () => (getAccountValidatorDatum(accountUTxOs)),
        );

        const updatedDatum: AccountDatum = {
            email: fromText("new_business@web3.ada"),
            phone: fromText("(288) 481-2686-999"),
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
            .completeProgram({
                localUPLCEval: false,
                setCollateral: 0n,
            });
        return tx;
    });
