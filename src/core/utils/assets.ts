import { UTxO } from "@lucid-evolution/lucid";
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

    // concat the prefix
    const prependPrefix = concatBytes(hexToBytes(prefix), prependIndex);

    // slice off the first 32 bytes and convert to hex
    return bytesToHex(prependPrefix.slice(0, 32));
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

    console.log("refTokenName: ", refTokenName);
    console.log("userTokenName: ", userTokenName);

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

export {
    assetNameLabels,
    createCip68TokenNames,
    findCip68TokenNames,
    generateUniqueAssetName,
};
