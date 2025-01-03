import {
    LucidEvolution,
    removeService,
} from "@anastasia-labs/payment-subscription-offchain";

export const runRemoveService = async (
    lucid: LucidEvolution,
): Promise<Error | void> => {
    // Remove Service
    try {
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
