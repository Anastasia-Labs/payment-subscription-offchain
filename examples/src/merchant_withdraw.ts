import {
    LucidEvolution,
    merchantWithdraw,
    MerchantWithdrawConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runMerchantWithdraw = async (
    lucid: LucidEvolution,
): Promise<Error | void> => {
    const currentTime = BigInt(Date.now());

    const merchantWithdrawConfig: MerchantWithdrawConfig = {
        service_nft_tn:
            "000643b001211d1f32d1cb5e4801ae7f2a413300a4d0035df831e5286f9dadaa",
        merchant_nft_tn:
            "000de14001211d1f32d1cb5e4801ae7f2a413300a4d0035df831e5286f9dadaa",
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
