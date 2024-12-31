import {
    Address,
    Assets,
    Constr,
    Data,
    LucidEvolution,
    mintingPolicyToId,
    RedeemerBuilder,
    TransactionError,
    TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getMultiValidator } from "../core/utils/index.js";
import { Effect } from "effect";
import { extractTokens } from "./utils.js";
import {
    accountPolicyId,
    accountScript,
} from "../core/validators/constants.js";

export const removeAccount = (
    lucid: LucidEvolution,
    // config: RemoveAccountConfig,
): Effect.Effect<TxSignBuilder, TransactionError, never> =>
    Effect.gen(function* () { // return type ,
        const subscriberAddress: Address = yield* Effect.promise(() =>
            lucid.wallet().address()
        );

        const validators = getMultiValidator(lucid, accountScript);
        // const accountPolicyId = mintingPolicyToId(validators.mintValidator);
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

        const mintingAssets: Assets = {
            [ref_token]: -1n,
            [user_token]: -1n,
        };

        if (!accountUTxOs || !accountUTxOs.length) {
            console.error(
                "No UTxO found at user address: " + validators.spendValAddress,
            );
        }

        const subscriberUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                user_token,
            )
        );

        const accountUTxO = yield* Effect.promise(() =>
            lucid.utxoByUnit(
                ref_token,
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
