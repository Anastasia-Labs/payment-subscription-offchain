import {
    AccountDatum,
    parseSafeDatum,
    PaymentDatum,
    PaymentValidatorDatum,
    PenaltyDatum,
    ServiceDatum,
    UTxO,
} from "../index.js"; // Adjust the import path as necessary
import { Effect } from "effect";
import {
    LucidEvolution,
    PolicyId,
    toUnit,
    TransactionError,
    TxBuilderError,
    Unit,
} from "@lucid-evolution/lucid";
import {
    findCip68TokenNames,
    tokenNameFromUTxO,
} from "../core/utils/assets.js";

// /**
//  * Extracts token units (userNft and refNft) from UTxOs.
//  * @param validatorUTxOs - Array of UTxOs from the validator address.
//  * @param walletUTxOs - Array of UTxOs from the wallet address.
//  * @returns An object containing userNft and refNft.
//  */
export const extractTokens = (
    policyId: PolicyId,
    validatorUTxOs: UTxO[],
    walletUTxOs: UTxO[],
): { user_token: Unit; ref_token: Unit } => {
    let user_token: Unit;
    let ref_token: Unit;
    if (validatorUTxOs.length > 0 && walletUTxOs.length > 0) {
        const { refTokenName, userTokenName } = findCip68TokenNames(
            validatorUTxOs,
            walletUTxOs,
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
            Effect.log(
                `------------------------- ${msg} -------------------------`,
            );
            Effect.log(utxos);
        }));
        // Return the UTxOs
        return utxos;
    });
};

export const getAccountValidatorDatum = async (
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

export const getServiceValidatorDatum = async (
    utxoOrUtxos: UTxO | UTxO[],
): Promise<ServiceDatum[]> => {
    const utxos = Array.isArray(utxoOrUtxos) ? utxoOrUtxos : [utxoOrUtxos];

    return utxos.flatMap((utxo, index) => {
        if (!utxo.datum) {
            console.error(`UTxO ${index} has no datum.`);
            return [];
        }

        try {
            const result = parseSafeDatum<ServiceDatum>(
                utxo.datum,
                ServiceDatum,
            );

            if (result.type == "right") {
                return [result.value]; // Return as array to match flatMap expectations
            } else {
                console.error(
                    `Failed to parse datum for UTxO ${index}:`,
                    result.type,
                );
                return [];
            }
        } catch (error) {
            console.error(
                `Exception while parsing datum for UTxO ${index}:`,
                error,
            );
            return [];
        }
    });
};

export const getPaymentValidatorDatum = async (
    utxoOrUtxos: UTxO | UTxO[],
): Promise<PaymentDatum[]> => {
    const utxos = Array.isArray(utxoOrUtxos) ? utxoOrUtxos : [utxoOrUtxos];

    return utxos.flatMap((utxo) => {
        const result = parseSafeDatum<PaymentValidatorDatum>(
            utxo.datum,
            PaymentValidatorDatum,
        );

        if (result.type == "right") {
            const paymentValidatorDatum = result.value;

            // Check if it's a Payment or Penalty
            if ("Payment" in paymentValidatorDatum) {
                const paymentDatum = paymentValidatorDatum.Payment[0];
                return [paymentDatum];
            } else {
                console.error(
                    `UTxO ${utxo.txHash} contains Penalty datum, skipping.`,
                );
                return [];
            }
        } else {
            return [];
        }
    });
};

export const getPenaltyDatum = async (
    utxoOrUtxos: UTxO | UTxO[],
): Promise<PenaltyDatum[]> => {
    const utxos = Array.isArray(utxoOrUtxos) ? utxoOrUtxos : [utxoOrUtxos];

    return utxos.flatMap((utxo) => {
        const result = parseSafeDatum<PaymentValidatorDatum>(
            utxo.datum,
            PaymentValidatorDatum,
        );

        if (result.type == "right") {
            const paymentValidatorDatum = result.value;

            // Check if it's a Payment or Penalty
            if ("Penalty" in paymentValidatorDatum) {
                const penaltyDatum = paymentValidatorDatum.Penalty[0];
                return [penaltyDatum];
            } else {
                console.error(
                    `UTxO ${utxo.txHash} contains Payment datum, skipping.`,
                );
                return [];
            }
        } else {
            return [];
        }
    });
};

interface WithdrawalCalc {
    withdrawableAmount: bigint;
    intervalsToWithdraw: number;
    timeSinceLastClaim: bigint;
    timeUntilEnd: bigint;
}

export const calculateClaimableIntervals = (
    currentTime: bigint,
    paymentData: PaymentDatum,
): WithdrawalCalc => {
    // Calculate time since last claim
    const timeSinceLastClaim = currentTime > paymentData.last_claimed
        ? currentTime - paymentData.last_claimed
        : BigInt(0);

    // Calculate time remaining until subscription end
    const timeUntilEnd = paymentData.subscription_end - currentTime;

    // Calculate intervals based on time since last claim
    const intervalsPassed = Number(timeSinceLastClaim) /
        Number(paymentData.interval_length);

    // Consider both passed intervals and remaining intervals
    let claimableIntervals = Math.min(
        intervalsPassed,
        Number(paymentData.num_intervals),
    );

    // If this is potentially the final interval
    if (
        paymentData.num_intervals <= 1n &&
        timeUntilEnd <= paymentData.interval_length
    ) {
        claimableIntervals = Math.max(1, claimableIntervals);
    }

    const withdrawableAmount = BigInt(Math.floor(claimableIntervals)) *
        paymentData.interval_amount;

    // console.log("Current Time:", currentTime);
    // console.log("Subscription Start:", paymentData.subscription_start);
    // console.log("Subscription End:", paymentData.subscription_end);
    // console.log("Last Claimed:", paymentData.last_claimed);
    // console.log("timeSinceLastClaim:", timeSinceLastClaim);
    // console.log("timeUntilEnd:", timeUntilEnd);
    // console.log("Interval Length:", paymentData.interval_length);
    // console.log("Number of Intervals:", paymentData.num_intervals);
    // console.log("intervalsPassed:", intervalsPassed);
    // console.log("claimableIntervals:", claimableIntervals);

    return {
        withdrawableAmount,
        intervalsToWithdraw: Math.floor(claimableIntervals),
        timeSinceLastClaim,
        timeUntilEnd,
    };
};

export const findUnsubscribePaymentUTxO = (
    paymentUTxOs: UTxO[],
    serviceNftTn: string,
    subscriberNftTn: string,
): Effect.Effect<UTxO, TransactionError, never> => {
    return Effect.gen(function* (_) {
        console.log("Starting search for UTxO with:");
        console.log("  - Service NFT:", serviceNftTn);
        console.log("  - Subscriber NFT:", subscriberNftTn);

        const results = yield* Effect.promise(() =>
            Promise.all(
                paymentUTxOs.map(async (utxo) => {
                    try {
                        const datum = await getPaymentValidatorDatum(utxo);
                        const serviceMatch =
                            datum[0].service_nft_tn === serviceNftTn;
                        const subscriberMatch =
                            datum[0].subscriber_nft_tn === subscriberNftTn;

                        console.log(
                            `\nChecking UTxO ${utxo.txHash.slice(0, 8)}:`,
                        );
                        console.log("  Service NFT matches:", serviceMatch);
                        console.log(
                            "  Subscriber NFT matches:",
                            subscriberMatch,
                        );

                        if (serviceMatch && subscriberMatch) {
                            console.log("  Found matching UTxO!");
                            return utxo;
                        }
                        return undefined;
                    } catch (error) {
                        console.log(
                            `\nError processing UTxO ${
                                utxo.txHash.slice(0, 8)
                            }:`,
                            error,
                        );
                        return undefined;
                    }
                }),
            )
        );

        const paymentUTxO = results.find((result) => result !== undefined);

        if (!paymentUTxO) {
            console.log("\nNo matching UTxO found!");
            return yield* Effect.fail(
                new TxBuilderError({
                    cause:
                        "No active subscription found for this subscriber and service",
                }),
            );
        }

        console.log("\nFound matching UTxO:", paymentUTxO.txHash);
        return paymentUTxO;
    });
};

export const findSubscriptionTokenNames = async (
    paymentUTxOs: UTxO[],
    subscriberNftTn: string,
    paymentPolicyId: string,
): Promise<{
    serviceNftTn: string;
    paymentNftTn: string;
}> => {
    // Find payment UTxO that has this subscriber
    for (const utxo of paymentUTxOs) {
        try {
            const datum = await getPaymentValidatorDatum(utxo);
            if (datum[0].subscriber_nft_tn === subscriberNftTn) {
                // Found the matching subscription
                const paymentNftTn = tokenNameFromUTxO([utxo], paymentPolicyId);
                return {
                    serviceNftTn: datum[0].service_nft_tn,
                    paymentNftTn,
                };
            }
        } catch {
            continue;
        }
    }
    throw new Error("No active subscription found for subscriber");
};

export const findPenaltyDetails = async (
    paymentUTxOs: UTxO[],
    serviceNftTn: string,
    paymentPolicyId: string,
): Promise<{
    paymentNftTn: string;
    penaltyDatum: PenaltyDatum;
}> => {
    for (const utxo of paymentUTxOs) {
        try {
            const penaltyDatums = await getPenaltyDatum(utxo);

            // Check if we found a penalty datum and it matches our service
            if (
                penaltyDatums.length > 0 &&
                penaltyDatums[0].service_nft_tn === serviceNftTn &&
                penaltyDatums[0].penalty_fee_qty > 0
            ) {
                const paymentNftTn = tokenNameFromUTxO([utxo], paymentPolicyId);
                return {
                    paymentNftTn,
                    penaltyDatum: penaltyDatums[0],
                };
            }
        } catch {
            continue;
        }
    }
    throw new Error(`No penalty found for service ${serviceNftTn}`);
};
