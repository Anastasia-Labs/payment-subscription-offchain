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
            "000643b001211d1f32d1cb5e4801ae7f2a413300a4d0035df831e5286f9dadaa",
        merchant_nft_tn:
            "000de14001211d1f32d1cb5e4801ae7f2a413300a4d0035df831e5286f9dadaa",
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
