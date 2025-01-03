import {
    findCip68TokenNames,
    LucidEvolution,
    merchantWithdraw,
    MerchantWithdrawConfig,
    servicePolicyId,
} from "@anastasia-labs/payment-subscription-offchain";

export const runMerchantWithdraw = async (
    lucid: LucidEvolution,
    serviceAddress: string,
    merchantAddress: string,
): Promise<Error | void> => {
    const serviceUTxOs = await lucid.utxosAt(serviceAddress);
    const merchantUTxOs = await lucid.utxosAt(merchantAddress);

    const currentTime = BigInt(Date.now());

    const { refTokenName: serviceNftTn, userTokenName: merchantNftTn } =
        findCip68TokenNames(
            [serviceUTxOs[0], merchantUTxOs[0]],
            servicePolicyId,
        );

    const merchantWithdrawConfig: MerchantWithdrawConfig = {
        service_nft_tn: serviceNftTn,
        merchant_nft_tn: merchantNftTn,
        last_claimed: currentTime + BigInt(1000 * 60 * 1), // 1 minute
    };

    // Merchant Withdraw
    try {
        const merchantWithdrawUnsigned = await merchantWithdraw(
            lucid,
            merchantWithdrawConfig,
        );
        const merchantWithdrawSigned = await merchantWithdrawUnsigned.sign
            .withWallet()
            .complete();
        const merchantWithdrawTxHash = await merchantWithdrawSigned.submit();

        console.log(`Merchant Withdraw Successful: ${merchantWithdrawTxHash}`);
    } catch (error) {
        console.error("Failed to withdraw by Merchant:", error);
    }
};
