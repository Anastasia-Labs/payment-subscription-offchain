import {
    LucidEvolution,
    merchantPenaltyWithdraw,
    WithdrawPenaltyConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runWithdrawPenalty = async (
    lucid: LucidEvolution,
): Promise<Error | void> => {
    const withdrawPenaltyConfig: WithdrawPenaltyConfig = {
        service_nft_tn:
            "000643b000b9ee22ca533ffa0efa19a274cb0b26ae606c2a1f5c4c19777934f0",
        merchant_nft_tn:
            "000de14000b9ee22ca533ffa0efa19a274cb0b26ae606c2a1f5c4c19777934f0",
        payment_nft_tn:
            "0058dfe1620ba6aa7d460adb82f20597de2bdcbb80904724d4c03eec3e47d987",
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
