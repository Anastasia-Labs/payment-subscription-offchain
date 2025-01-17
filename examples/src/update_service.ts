import {
    LucidEvolution,
    updateService,
    UpdateServiceConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runUpdateService = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    merchantNftTn: string,
): Promise<Error | void> => {
    const updateServiceConfig: UpdateServiceConfig = {
        service_nft_tn: serviceNftTn,
        merchant_nft_tn: merchantNftTn,
        new_service_fee_qty: 9_500_000n,
        new_penalty_fee_qty: 1_000_000n,
        new_interval_length: 1n,
        new_num_intervals: 12n,
        new_minimum_ada: 2_000_000n,
    };

    // Update Service
    try {
        const updateServiceUnsigned = await updateService(
            lucid,
            updateServiceConfig,
        );
        const updateTxSigned = await updateServiceUnsigned.sign.withWallet()
            .complete();
        const initTxHash = await updateTxSigned.submit();

        console.log(`Service updated successfully: ${initTxHash}`);
    } catch (error) {
        console.error("Failed to update service:", error);
    }
};
