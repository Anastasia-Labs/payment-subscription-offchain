import { UTxO } from "@lucid-evolution/lucid";
import { blake2b } from "@noble/hashes/blake2b";
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
    const prependIndex = concatBytes(indexByte,txIdHash);

    // concat the prefix
    const prependPrefix = concatBytes(hexToBytes(prefix), prependIndex);

    // slice off the first 32 bytes and convert to hex
    //return bytesToHex(prependPrefix.slice(0, 31));
    return bytesToHex(prependPrefix.slice(0, 32));
};

export { assetNameLabels, generateUniqueAssetName };

