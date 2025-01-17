import {
    Address,
    Assets,
    Constr,
    Data,
    LucidEvolution,
    RedeemerBuilder,
    toUnit,
    TransactionError,
    TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { Effect } from "effect";
import {
    accountPolicyId,
    accountScript,
} from "../core/validators/constants.js";
import { RemoveAccountConfig } from "../core/types.js";

export const removeAccountProgram = (
    lucid: LucidEvolution,
    config: RemoveAccountConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () { // return type ,
        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );

        const validators = getMultiValidator(lucid, accountScript);
        const accountUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(validators.mintValAddress)
        );

        const subscriberUTxOs = yield* Effect.promise(() =>
            lucid.utxosAt(subscriberAddress)
        );

        const accountNFT = toUnit(
            accountPolicyId,
            config.account_nft_tn,
        );

        const subscriberNFT = toUnit(
            accountPolicyId,
            config.subscriber_nft_tn,
        );

        const mintingAssets: Assets = {
            [accountNFT]: -1n,
            [subscriberNFT]: -1n,
        };

        if (!accountUTxOs || !accountUTxOs.length) {
            console.error(
                "No UTxO found at user address: " + validators.spendValAddress,
            );
        }

        console.log("removeAccountProgram: subscriberUTxOs", subscriberUTxOs);

        const subscriberUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                subscriberNFT,
            )
        );

        const accountUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                accountNFT,
            )
        );

        const deleteAccRedeemer = Data.to(new Constr(1, [])); // Assuming DeleteAccount is index 1 in your MintAccount enum
        const removeAccountRedeemer: RedeemerBuilder = {
            kind: "selected",
            makeRedeemer: (inputIndices: bigint[]) => {
                // Construct the redeemer using the input indices
                const userIndex = inputIndices[0];
                const accountIndex = inputIndices[1];

                return Data.to(
                    new Constr(1, [
                        new Constr(1, [
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
            .collectFrom([accountUTxO], removeAccountRedeemer)
            .mintAssets(
                mintingAssets,
                deleteAccRedeemer,
            )
            .attach.MintingPolicy(validators.mintValidator)
            .attach.SpendingValidator(validators.spendValidator)
            .completeProgram();

        return tx;
    });
