import {
    LucidEvolution,
    merchantWithdraw,
    MerchantWithdrawConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runMerchantWithdraw = async (
    lucid: LucidEvolution,
): Promise<Error | void> => {
    const merchantWithdrawConfig: MerchantWithdrawConfig = {
        service_nft_tn:
            "000643b00072210afcd6d8c4d4794e74b602f2cbb81bd16c4ad4605720c3d4a1",
        merchant_nft_tn:
            "000de1400072210afcd6d8c4d4794e74b602f2cbb81bd16c4ad4605720c3d4a1",
        payment_nft_tn:
            "004df979b99093bc6fa8176dcfd776dacc65f4f724bed5a50a0c3b932369a934",
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
