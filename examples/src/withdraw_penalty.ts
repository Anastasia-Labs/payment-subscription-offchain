import {
    findCip68TokenNames,
    LucidEvolution,
    merchantPenaltyWithdraw,
    servicePolicyId,
    WithdrawPenaltyConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runWithdrawPenalty = async (
    lucid: LucidEvolution,
    serviceAddress: string,
    merchantAddress: string,
): Promise<Error | void> => {
    const serviceUTxOs = await lucid.utxosAt(serviceAddress);
    const merchantUTxOs = await lucid.utxosAt(merchantAddress);

    const { refTokenName: serviceNftTn, userTokenName: merchantNftTn } =
        findCip68TokenNames(
            [serviceUTxOs[0], merchantUTxOs[0]],
            servicePolicyId,
        );

    const withdrawPenaltyConfig: WithdrawPenaltyConfig = {
        service_nft_tn: serviceNftTn,
        merchant_nft_tn: merchantNftTn,
        merchant_utxos: merchantUTxOs,
        service_utxos: serviceUTxOs,
    };

    // Merchant Withdraw
    try {
        const penaltyWithdrawUnsigned = await merchantPenaltyWithdraw(
            lucid,
            withdrawPenaltyConfig,
        );
        const penaltyWithdrawSigned = await penaltyWithdrawUnsigned.sign
            .withWallet()
            .complete();
        const penaltyWithdrawTxHash = await penaltyWithdrawSigned.submit();

        console.log(`Service created successfully: ${penaltyWithdrawTxHash}`);
    } catch (error) {
        console.error("Failed to create service:", error);
    }
};
