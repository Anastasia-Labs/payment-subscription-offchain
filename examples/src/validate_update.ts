import {
    getUserAddressAndPKH,
    LucidEvolution,
    UpdateValidateConfig,
    validateUpdate,
} from "@anastasia-labs/aiken-multisig-offchain";

export const runUpdate = async (
    lucid: LucidEvolution,
    INITIATOR_SEED: string,
    SIGNER_ONE_SEED: string,
    SIGNER_TWO_SEED: string,
    SIGNER_THREE_SEED: string,
): Promise<Error | void> => {
    if (!INITIATOR_SEED || !SIGNER_ONE_SEED || !SIGNER_TWO_SEED) {
        throw new Error("Missing required environment variables.");
    }

    const initiator = await getUserAddressAndPKH(lucid, INITIATOR_SEED);
    const signer1 = await getUserAddressAndPKH(lucid, SIGNER_ONE_SEED);
    const signer2 = await getUserAddressAndPKH(lucid, SIGNER_TWO_SEED);
    const signer3 = await getUserAddressAndPKH(lucid, SIGNER_THREE_SEED);

    const updateConfig: UpdateValidateConfig = {
        new_signers: [
            initiator.pkh,
            signer1.pkh,
            signer2.pkh,
            signer3.pkh,
        ],
        new_threshold: 3n,
        funds: {
            policyId: "",
            assetName: "",
        },
        new_spending_limit: 15_000_000n,
        minimum_ada: 2_000_000n,
    };
    // Update multisig
    try {
        lucid.selectWallet.fromSeed(INITIATOR_SEED);
        const updateTxUnsigned = await validateUpdate(lucid, updateConfig);

        const cboredTx = updateTxUnsigned.toCBOR();
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

        const assembleTx = updateTxUnsigned.assemble(partialSignatures);
        const completeSign = await assembleTx.complete();
        const signTxHash = await completeSign.submit();

        console.log(`Multisig Contract Updated Successfully: ${signTxHash}`);
    } catch (error) {
        console.error("Failed to Update multisig:", error);
    }
};
