import {
    endMultiSig,
    getUserAddressAndPKH,
    LucidEvolution,
    SignConfig,
} from "@anastasia-labs/aiken-multisig-offchain";

export const runEnd = async (
    lucid: LucidEvolution,
    INITIATOR_SEED: string,
    SIGNER_ONE_SEED: string,
    SIGNER_TWO_SEED: string,
    SIGNER_THREE_SEED: string,
    RECIPIENT_SEED: string,
): Promise<Error | void> => {
    if (!INITIATOR_SEED || !SIGNER_ONE_SEED || !SIGNER_TWO_SEED) {
        throw new Error("Missing required environment variables.");
    }

    const initiator = await getUserAddressAndPKH(lucid, INITIATOR_SEED);
    const signer1 = await getUserAddressAndPKH(lucid, SIGNER_ONE_SEED);
    const signer2 = await getUserAddressAndPKH(lucid, SIGNER_TWO_SEED);
    const signer3 = await getUserAddressAndPKH(lucid, SIGNER_THREE_SEED);
    const recipient = await getUserAddressAndPKH(lucid, RECIPIENT_SEED);

    const signConfig: SignConfig = {
        signers: [initiator.pkh, signer1.pkh, signer2.pkh, signer3.pkh],
        threshold: 3n,
        funds: {
            policyId: "",
            assetName: "",
        },
        spending_limit: 10_000_000n,
        minimum_ada: 2_000_000n,
        recipient_address: recipient.address,
    };
    // End multisig
    try {
        lucid.selectWallet.fromSeed(INITIATOR_SEED);
        const endTxUnsigned = await endMultiSig(lucid, signConfig);

        const cboredTx = endTxUnsigned.toCBOR();
        const partialSignatures: string[] = [];

        for (
            const signerSeed of [
                INITIATOR_SEED,
                SIGNER_ONE_SEED,
                SIGNER_TWO_SEED,
                SIGNER_THREE_SEED,
            ]
        ) {
            lucid.selectWallet.fromSeed(signerSeed);
            const partialSigner = await lucid
                .fromTx(cboredTx)
                .partialSign
                .withWallet();
            partialSignatures.push(partialSigner);
        }

        const assembleTx = endTxUnsigned.assemble(partialSignatures);
        const completeSign = await assembleTx.complete();
        const signTxHash = await completeSign.submit();

        console.log(`Multisig Contract Ended Successfully: ${signTxHash}`);
    } catch (error) {
        console.error("Failed to End multisig:", error);
    }
};
