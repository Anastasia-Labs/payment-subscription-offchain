import {
    LucidEvolution,
    removeService,
} from "@anastasia-labs/payment-subscription-offchain";

// TODO:
export const runRemoveService = async (
    lucid: LucidEvolution,
    MERCHANT_WALLET_SEED: string,
): Promise<Error | void> => {
    if (!MERCHANT_WALLET_SEED) {
        throw new Error("Missing required environment variables.");
    }

    // Remove Service
    try {
        lucid.selectWallet.fromSeed(MERCHANT_WALLET_SEED);
        const removeServiceUnsigned = await removeService(
            lucid,
        );
        const removeServiceSigned = await removeServiceUnsigned.sign
            .withWallet()
            .complete();
        const removeServiceHash = await removeServiceSigned.submit();

        console.log(
            `Service removed successfully || change isActive to false: ${removeServiceHash}`,
        );
    } catch (error) {
        console.error("Failed to remove Service:", error);
    }
};
