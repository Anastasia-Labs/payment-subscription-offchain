import {
    createAccount,
    CreateAccountConfig,
    LucidEvolution,
} from "../index.js";
import { makeLucidContext } from "./lucid.js";

export const runCborSubmit = async (
    lucid: LucidEvolution,
): Promise<Error | void> => {

    // // Submit Endpoint multisig
    try {

        const parsedTx = lucid.fromTx("Put your CBOR transaction here");
        const cboredTx = parsedTx.toCBOR();
        // const partialSignatures: string[] = [];

        // Array to collect partial signatures
        const signedTx = lucid
        .fromTx(cboredTx)
        .sign
        .withWallet();

        const cborTxSigned = await signedTx.complete();

        // Submit the signed transaction
        const txHash = await cborTxSigned.submit();
        
        console.log(`Transaction submitted Successfully with hash: ${txHash}`);
        await lucid.awaitTx(txHash);
        
        console.log(`Transaction confirmed successfully: ${txHash}`);
        } catch (error) {
            console.error("Failed to submit transaction:", error);
            return error as Error;
        }
};

const lucidContext = await makeLucidContext()
const lucid = lucidContext.lucid
lucid.selectWallet.fromSeed(lucidContext.users.merchant.seedPhrase)
await runCborSubmit(lucid)
