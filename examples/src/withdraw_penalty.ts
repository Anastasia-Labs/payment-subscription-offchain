import {
    LucidEvolution,
    merchantPenaltyWithdraw,
    WithdrawPenaltyConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runWithdrawPenalty = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    merchant_nft_tn: string,
): Promise<Error | void> => {
    const withdrawPenaltyConfig: WithdrawPenaltyConfig = {
        service_nft_tn: serviceNftTn,
        merchant_nft_tn: merchant_nft_tn,
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

        console.log(`Submitting ...`);
        await lucid.awaitTx(penaltyWithdrawTxHash);

        console.log(`Service created successfully: ${penaltyWithdrawTxHash}`);
    } catch (error) {
        console.error("Failed to create service:", error);
    }
};
