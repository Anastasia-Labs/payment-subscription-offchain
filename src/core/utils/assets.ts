import { Assets, UTxO } from "@lucid-evolution/lucid";
import { bytesToHex, concatBytes, hexToBytes } from "@noble/hashes/utils";
import { sha3_256 } from "@noble/hashes/sha3";

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
    const refPrefix = "000643b0";
    const userPrefix = "000de140";

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

// const findCip68TokenNames = (
//     walletUtxos: UTxO[],
//     contractUtxos: UTxO[],
//     policyId: string,
// ): { refTokenName: string; userTokenName: string } => {
//     const refPrefix = "000643b0";
//     const userPrefix = "000de140";

//     console.log("Debug - Policy ID:", policyId);
//     console.log("Debug - Wallet UTxOs:", walletUtxos);
//     console.log("Debug - Contract UTxOs:", contractUtxos);

//     // Find all tokens in wallet UTxOs first
//     const userTokens = new Set<string>();
//     for (const utxo of walletUtxos) {
//         console.log("Debug - Processing wallet UTxO:", {
//             txHash: utxo.txHash,
//             assets: utxo.assets,
//         });
//         for (const assetName in utxo.assets) {
//             console.log("Debug - Checking asset:", assetName);
//             if (assetName.startsWith(policyId)) {
//                 const tokenName = assetName.slice(policyId.length);
//                 console.log("Debug - Found token with name:", tokenName);
//                 if (tokenName.startsWith(userPrefix)) {
//                     userTokens.add(tokenName);
//                     console.log("Debug - Added user token:", tokenName);
//                 }
//             }
//         }
//     }

//     // Find matching reference tokens in contract UTxOs
//     const refTokens = new Set<string>();
//     for (const utxo of contractUtxos) {
//         console.log("Debug - Processing contract UTxO:", {
//             txHash: utxo.txHash,
//             assets: utxo.assets,
//         });
//         for (const assetName in utxo.assets) {
//             console.log("Debug - Checking asset:", assetName);
//             if (assetName.startsWith(policyId)) {
//                 const tokenName = assetName.slice(policyId.length);
//                 console.log("Debug - Found token with name:", tokenName);
//                 if (tokenName.startsWith(refPrefix)) {
//                     refTokens.add(tokenName);
//                     console.log("Debug - Added ref token:", tokenName);
//                 }
//             }
//         }
//     }

//     // If we haven't found any tokens in normal search, try searching in combined UTxOs
//     if (userTokens.size === 0 && refTokens.size === 0) {
//         console.log(
//             "Debug - No tokens found in initial search, trying combined search",
//         );
//         const allUtxos = [...walletUtxos, ...contractUtxos];
//         for (const utxo of allUtxos) {
//             for (const assetName in utxo.assets) {
//                 if (assetName.startsWith(policyId)) {
//                     const tokenName = assetName.slice(policyId.length);
//                     if (tokenName.startsWith(refPrefix)) {
//                         refTokens.add(tokenName);
//                     } else if (tokenName.startsWith(userPrefix)) {
//                         userTokens.add(tokenName);
//                     }
//                 }
//             }
//         }
//     }

//     console.log("User tokens found:", Array.from(userTokens));
//     console.log("Reference tokens found:", Array.from(refTokens));

//     if (userTokens.size === 0) {
//         console.log("Debug - Available assets in wallet UTxOs:");
//         walletUtxos.forEach((utxo) => {
//             console.log(utxo.assets);
//         });
//         throw new Error("No user token found in wallet");
//     }

//     if (refTokens.size === 0) {
//         console.log("Debug - Available assets in contract UTxOs:");
//         contractUtxos.forEach((utxo) => {
//             console.log(utxo.assets);
//         });
//         throw new Error("No reference tokens found in contract");
//     }

//     // Find matching pairs
//     for (const userToken of userTokens) {
//         const userSuffix = userToken.slice(userPrefix.length);
//         const matchingRefToken = Array.from(refTokens).find(
//             (refToken) => refToken.slice(refPrefix.length) === userSuffix,
//         );

//         if (matchingRefToken) {
//             console.log("Debug - Found matching pair:", {
//                 userToken,
//                 matchingRefToken,
//             });
//             return {
//                 refTokenName: matchingRefToken,
//                 userTokenName: userToken,
//             };
//         }
//     }

//     throw new Error("No matching token pairs found");
// };

// const findCip68TokenNames = (
//     walletUtxos: UTxO[],
//     contractUtxos: UTxO[],
//     policyId: string,
// ): { refTokenName: string; userTokenName: string } => {
//     const refPrefix = "000643b0";
//     const userPrefix = "000de140";

//     // Store all found tokens
//     const refTokens: string[] = [];
//     const userTokens: string[] = [];

//     // Find all tokens first
//     for (const utxo of [...walletUtxos, ...contractUtxos]) {
//         for (const assetName in utxo.assets) {
//             if (assetName.startsWith(policyId)) {
//                 const tokenName = assetName.slice(policyId.length);
//                 if (tokenName.startsWith(refPrefix)) {
//                     refTokens.push(tokenName);
//                 } else if (tokenName.startsWith(userPrefix)) {
//                     userTokens.push(tokenName);
//                 }
//             }
//         }
//     }

//     // Find matching pairs
//     for (const refToken of refTokens) {
//         const refId = refToken.slice(refPrefix.length);
//         for (const userToken of userTokens) {
//             const userId = userToken.slice(userPrefix.length);
//             if (refId === userId) {
//                 return {
//                     refTokenName: refToken,
//                     userTokenName: userToken,
//                 };
//             }
//         }
//     }

//     throw new Error("No matching token pair found");
// };

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

export {
    assetNameLabels,
    createCip68TokenNames,
    findCip68TokenNames,
    generateUniqueAssetName,
    tokenNameFromUTxO,
};
