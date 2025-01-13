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
            "000643b000c8623b17d87945ce4c3846b0b4cde072602b8ce166c94127fddb8e",
        merchant_nft_tn:
            "000de14000c8623b17d87945ce4c3846b0b4cde072602b8ce166c94127fddb8e",
        payment_nft_tn:
            "00a010341a97e7125d211352a863cbe6e7f71891bca2acb02a50326726ffd59a",
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
