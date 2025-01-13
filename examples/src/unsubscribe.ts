import {
    LucidEvolution,
    unsubscribe,
    UnsubscribeConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runUnsubscribe = async (
    lucid: LucidEvolution,
): Promise<Error | void> => {
    const unsubscribeConfig: UnsubscribeConfig = {
        service_nft_tn:
            "000643b000b9ee22ca533ffa0efa19a274cb0b26ae606c2a1f5c4c19777934f0",
        subscriber_nft_tn:
            "000de1400049aa20e262b326b27d4272b83d66ee7f68fb7a2d428a104aa66792",
        payment_nft_tn:
            "0058dfe1620ba6aa7d460adb82f20597de2bdcbb80904724d4c03eec3e47d987",
    };

    // Unsubscribe
    try {
        const initSubscriptionUnsigned = await unsubscribe(
            lucid,
            unsubscribeConfig,
        );
        const initSubscriptionSigned = await initSubscriptionUnsigned.sign
            .withWallet()
            .complete();
        const initSubscriptionHash = await initSubscriptionSigned.submit();

        console.log(
            `Unsubscribed successfully: ${initSubscriptionHash}`,
        );
    } catch (error) {
        console.error("Failed to unsubscribe:", error);
    }
};
