import {
    LucidEvolution,
    updateService,
    UpdateServiceConfig,
} from "../index.js";

export const runUpdateService = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    merchantNftTn: string,
): Promise<Error | void> => {
    const updateServiceConfig: UpdateServiceConfig = {
        service_nft_tn: serviceNftTn,
        merchant_nft_tn: merchantNftTn,
        new_service_fee: 9_500_000n,
        new_penalty_fee: 1_000_000n,
        new_interval_length: 10n * 24n * 60n * 60n * 1000n,
        new_num_intervals: 10n,
    };

    try {
        const updateServiceUnsigned = await updateService(
            lucid,
            updateServiceConfig,
        );
        const updateTxSigned = await updateServiceUnsigned.sign.withWallet()
            .complete();
        const updateTxHash = await updateTxSigned.submit();

        console.log(`Submitting ...`);
        await lucid.awaitTx(updateTxHash);

        console.log(`Service updated successfully: ${updateTxHash}`);
    } catch (error) {
        console.error("Failed to update service:", error);
    }
};
