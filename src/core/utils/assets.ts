import { Assets, UTxO } from "@lucid-evolution/lucid";
import { bytesToHex, concatBytes, hexToBytes } from "@noble/hashes/utils";
import { sha3_256 } from "@noble/hashes/sha3";
import { getPaymentValidatorDatum } from "../../endpoints/utils.js";

const assetNameLabels = {
    prefix100: "000643b0",
    prefix222: "000de140",
    prefix333: "0014df10",
    prefix444: "001bc280",
};

const generateUniqueAssetName = (utxo: UTxO, prefix: string): string => {
    // sha3_256 hash of the tx id
    const txIdHash = sha3_256(hexToBytes(utxo.txHash));

    // prefix the txid hash with the index
    const indexByte = new Uint8Array([utxo.outputIndex]);
    const prependIndex = concatBytes(indexByte, txIdHash);

    if (prefix != null) {
        // concat the prefix
        const prependPrefix = concatBytes(hexToBytes(prefix), prependIndex);
        return bytesToHex(prependPrefix.slice(0, 32));
    } else {
        return bytesToHex(prependIndex.slice(0, 32));
    }
};

const findCip68TokenNames = (
    walletUtxos: UTxO[],
    contractUtxos: UTxO[],
    policyId: string,
): { refTokenName: string; userTokenName: string } => {
    const refPrefix = assetNameLabels.prefix100;
    const userPrefix = assetNameLabels.prefix222;

    console.log("Debug - Processing inputs:", {
        policyId,
        walletUtxoCount: walletUtxos.length,
        contractUtxoCount: contractUtxos.length,
    });

    // Find the most recent user token in wallet UTxOs
    let latestUserToken = "";
    let latestTxHash = "";

    for (const utxo of walletUtxos) {
        for (const [assetName, amount] of Object.entries(utxo.assets)) {
            // Only consider tokens with amount === 1n (NFTs)
            if (amount === 1n && assetName.startsWith(policyId)) {
                const tokenName = assetName.slice(policyId.length);
                if (tokenName.startsWith(userPrefix)) {
                    // If this transaction is more recent, update our selection
                    if (!latestTxHash || utxo.txHash > latestTxHash) {
                        latestUserToken = tokenName;
                        latestTxHash = utxo.txHash;
                        console.log("Debug - Found newer user token:", {
                            token: latestUserToken,
                            txHash: latestTxHash,
                        });
                    }
                }
            }
        }
    }

    // If no user token found in wallet, try finding in any UTxO
    if (!latestUserToken) {
        const allUtxos = [...walletUtxos, ...contractUtxos];
        for (const utxo of allUtxos) {
            for (const [assetName, amount] of Object.entries(utxo.assets)) {
                if (amount === 1n && assetName.startsWith(policyId)) {
                    const tokenName = assetName.slice(policyId.length);
                    if (tokenName.startsWith(userPrefix)) {
                        if (!latestTxHash || utxo.txHash > latestTxHash) {
                            latestUserToken = tokenName;
                            latestTxHash = utxo.txHash;
                        }
                    }
                }
            }
        }
    }

    if (!latestUserToken) {
        console.log("Debug - No user token found. Available assets:", {
            walletAssets: walletUtxos.map((u) => Object.keys(u.assets)),
            contractAssets: contractUtxos.map((u) => Object.keys(u.assets)),
        });
        throw new Error("No user token found in UTxOs");
    }

    // Find matching reference token
    const userSuffix = latestUserToken.slice(userPrefix.length);
    let matchingRefToken = null;

    // First try contract UTxOs
    for (const utxo of contractUtxos) {
        for (const [assetName, amount] of Object.entries(utxo.assets)) {
            if (amount === 1n && assetName.startsWith(policyId)) {
                const tokenName = assetName.slice(policyId.length);
                if (
                    tokenName.startsWith(refPrefix) &&
                    tokenName.slice(refPrefix.length) === userSuffix
                ) {
                    matchingRefToken = tokenName;
                    break;
                }
            }
        }
        if (matchingRefToken) break;
    }

    // If not found in contract UTxOs, try all UTxOs
    if (!matchingRefToken) {
        const allUtxos = [...walletUtxos, ...contractUtxos];
        for (const utxo of allUtxos) {
            for (const [assetName, amount] of Object.entries(utxo.assets)) {
                if (amount === 1n && assetName.startsWith(policyId)) {
                    const tokenName = assetName.slice(policyId.length);
                    if (
                        tokenName.startsWith(refPrefix) &&
                        tokenName.slice(refPrefix.length) === userSuffix
                    ) {
                        matchingRefToken = tokenName;
                        break;
                    }
                }
            }
            if (matchingRefToken) break;
        }
    }

    if (!matchingRefToken) {
        console.log(
            "Debug - No matching ref token found for user token:",
            latestUserToken,
        );
        console.log("Debug - Available assets:", {
            walletAssets: walletUtxos.map((u) => Object.keys(u.assets)),
            contractAssets: contractUtxos.map((u) => Object.keys(u.assets)),
        });
        throw new Error(
            `No matching reference token found for user token ${latestUserToken}`,
        );
    }

    const result = {
        refTokenName: matchingRefToken,
        userTokenName: latestUserToken,
    };

    console.log("Debug - Returning token pair:", result);
    return result;
};

const createCip68TokenNames = (utxo: UTxO) => {
    const refTokenName = generateUniqueAssetName(
        utxo,
        assetNameLabels.prefix100,
    );
    const userTokenName = generateUniqueAssetName(
        utxo,
        assetNameLabels.prefix222,
    );
    return { refTokenName, userTokenName };
};

const tokenNameFromUTxO = (
    utxoOrUtxos: UTxO | UTxO[],
    policyId: string,
): string => {
    const utxos = Array.isArray(utxoOrUtxos) ? utxoOrUtxos : [utxoOrUtxos];

    for (const utxo of utxos) {
        const assets: Assets = utxo.assets;

        for (const [assetId, amount] of Object.entries(assets)) {
            // NFTs typically have an amount of 1
            if (amount === 1n && assetId.startsWith(policyId)) {
                // Extract the token name (everything after the policy ID)
                const tokenName = assetId.slice(policyId.length);
                return tokenName;
            }
        }
    }

    // If no matching NFT is found, return null
    return "";
};

const findSubscriberPaymentTokenName = (
    paymentUTxOs: UTxO[],
    subscriberNftTn: string,
    serviceNftTn: string,
    paymentPolicyId: string,
): string => {
    console.log("Searching for subscription with:", {
        serviceNftTn,
        subscriberNftTn,
    });

    const results =
        paymentUTxOs.map((utxo) => {
            try {
                const datums = getPaymentValidatorDatum(utxo);
                console.log("UTxO", utxo.txHash.slice(0, 8), "datum result:", {
                    found: datums.length > 0,
                    datum: datums[0],
                    matches: datums.length > 0 &&
                        datums[0].subscriber_nft_tn === subscriberNftTn &&
                        datums[0].service_nft_tn === serviceNftTn,
                });

                return datums.length > 0 &&
                        datums[0].subscriber_nft_tn === subscriberNftTn &&
                        datums[0].service_nft_tn === serviceNftTn
                    ? tokenNameFromUTxO([utxo], paymentPolicyId)
                    : null;
            } catch (error) {
                console.error(
                    "Error processing UTxO",
                    utxo.txHash.slice(0, 8),
                    error,
                );
                return null;
            }
        })

    const paymentNftTn = results.find((result) => result !== null);
    if (!paymentNftTn) {
        throw new Error(
            "No active subscription found for this subscriber and service",
        );
    }

    return paymentNftTn;
};

export {
    assetNameLabels,
    createCip68TokenNames,
    findCip68TokenNames,
    findSubscriberPaymentTokenName,
    generateUniqueAssetName,
    tokenNameFromUTxO,
};
