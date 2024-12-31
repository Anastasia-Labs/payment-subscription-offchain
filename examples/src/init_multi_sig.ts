import {
    getUserAddressAndPKH,
    initiateMultiSig,
    LucidEvolution,
    MultiSigConfig,
} from "@anastasia-labs/aiken-multisig-offchain";

export const runInit = async (
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

    const initConfig: MultiSigConfig = {
        signers: [initiator.pkh, signer1.pkh, signer2.pkh, signer3.pkh],
        threshold: 2n,
        funds: { policyId: "", assetName: "" },
        spending_limit: 10_000_000n,
        total_funds_qty: 100_000_000n,
        minimum_ada: 2_000_000n,
    };

    // Initiate multisig
    try {
        lucid.selectWallet.fromSeed(INITIATOR_SEED);
        const initTxUnsigned = await initiateMultiSig(lucid, initConfig);
        const initTxSigned = await initTxUnsigned.sign.withWallet().complete();
        const initTxHash = await initTxSigned.submit();

        console.log(`Multisig Contract Initiated Successfully: ${initTxHash}`);
    } catch (error) {
        console.error("Failed to initiate multisig:", error);
    }
};
