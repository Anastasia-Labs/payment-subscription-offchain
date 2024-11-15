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
    utxos: UTxO[],
    policyId: string,
): { refTokenName: string; userTokenName: string } => {
    let refTokenName, userTokenName;

    for (const utxo of utxos) {
        for (const assetName in utxo.assets) {
            if (assetName.startsWith(policyId)) {
                const tokenName = assetName.slice(policyId.length);
                if (tokenName.startsWith(assetNameLabels.prefix100)) {
                    refTokenName = tokenName;
                } else if (tokenName.startsWith(assetNameLabels.prefix222)) {
                    userTokenName = tokenName;
                }
            }
        }
        if (refTokenName && userTokenName) break;
    }

    if (!refTokenName || !userTokenName) {
        throw new Error("Failed to find both reference and user token names");
    }

    return { refTokenName, userTokenName };
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

export {
    assetNameLabels,
    createCip68TokenNames,
    findCip68TokenNames,
    generateUniqueAssetName,
    tokenNameFromUTxO,
};
