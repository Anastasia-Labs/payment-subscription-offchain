// src/test/utils.ts

import {
    AccountDatum,
    getMultiValidator,
    parseSafeDatum,
    toUnit,
    UTxO,
    validatorToAddress,
} from "../index.js"; // Adjust the import path as necessary
import { Effect } from "effect";
import {
    LucidEvolution,
    mintingPolicyToId,
    PolicyId,
    Unit,
} from "@lucid-evolution/lucid";
import { findCip68TokenNames } from "../core/utils/assets.js";

/**
 * Extracts token units (userNft and refNft) from UTxOs.
 * @param validatorUTxOs - Array of UTxOs from the validator address.
 * @param walletUTxOs - Array of UTxOs from the wallet address.
 * @returns An object containing userNft and refNft.
 */
export const extractTokens = (
    policyId: PolicyId,
    validatorUTxOs: UTxO[],
    walletUTxOs: UTxO[],
): { user_token: Unit; ref_token: Unit } => {
    let user_token: Unit;
    let ref_token: Unit;
    if (validatorUTxOs.length > 0 && walletUTxOs.length > 0) {
        const { refTokenName, userTokenName } = findCip68TokenNames(
            [...validatorUTxOs, ...walletUTxOs],
            policyId,
        );

        ref_token = toUnit(policyId, refTokenName);
        user_token = toUnit(policyId, userTokenName);
        return { user_token, ref_token };
    } else {
        throw new Error("Failed to find both UTxOs");
    }
};

export const getWalletUTxOs = (
    lucid: LucidEvolution,
): Effect.Effect<UTxO[], never> => {
    return Effect.gen(function* ($) {
        // Fetch the wallet address
        const walletAddr: string = yield* $(
            Effect.promise(() => lucid.wallet().address()),
        );

        // Fetch UTxOs at the wallet address
        const utxos: UTxO[] = yield* $(
            Effect.promise(() => lucid.utxosAt(walletAddr)),
        );

        // Return the UTxOs
        return utxos;
    });
};

export const logWalletUTxOs = (
    lucid: LucidEvolution,
    msg: string,
): Effect.Effect<UTxO[], never, void> => {
    return Effect.gen(function* ($) {
        // Fetch UTxOs at the wallet address
        const utxos: UTxO[] = yield* $(getWalletUTxOs(lucid));

        // Perform the side-effect of logging
        yield* $(Effect.sync(() => {
            console.log(
                `------------------------- ${msg} -------------------------`,
            );
            console.log(utxos);
        }));
        // Return the UTxOs
        return utxos;
    });
};

export const getValidatorDatum = async (
    utxos: UTxO[],
): Promise<AccountDatum[]> => {
    return utxos.flatMap((utxo) => {
        const result = parseSafeDatum<AccountDatum>(utxo.datum, AccountDatum);

        if (result.type == "right") {
            return {
                email: result.value.email,
                phone: result.value.phone,
                account_created: result.value.account_created,
            };
        } else {
            return [];
        }
    });
};