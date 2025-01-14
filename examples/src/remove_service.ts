import {
    LucidEvolution,
    removeService,
    RemoveServiceConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runRemoveService = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    merchantNftTn: string,
): Promise<Error | void> => {
    const removeServiceConfig: RemoveServiceConfig = {
        service_nft_tn: serviceNftTn,
        merchant_nft_tn: merchantNftTn,
    };

    // Remove Service
    try {
        const removeServiceUnsigned = await removeService(
            lucid,
            removeServiceConfig,
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
