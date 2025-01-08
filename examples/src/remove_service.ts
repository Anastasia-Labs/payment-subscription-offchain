import {
    findCip68TokenNames,
    LucidEvolution,
    removeService,
    RemoveServiceConfig,
    servicePolicyId,
} from "@anastasia-labs/payment-subscription-offchain";

export const runRemoveService = async (
    lucid: LucidEvolution,
    serviceAddress: string,
    merchantAddress: string,
): Promise<Error | void> => {
    const serviceUTxOs = await lucid.utxosAt(serviceAddress);
    const merchantUTxOs = await lucid.utxosAt(merchantAddress);

    const { refTokenName: serviceNftTn, userTokenName: merchantNftTn } =
        findCip68TokenNames(
            [...serviceUTxOs, ...merchantUTxOs],
            servicePolicyId,
        );

    const removeServiceConfig: RemoveServiceConfig = {
        service_nft_tn:
            "000643b000ec9e1a5a9f39cc96d2f5c51f22d01de412428772a77ac176871b9b",
        merchant_nft_tn:
            "000de14000ec9e1a5a9f39cc96d2f5c51f22d01de412428772a77ac176871b9b",
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
