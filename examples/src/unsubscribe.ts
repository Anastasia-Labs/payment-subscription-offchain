import {
    LucidEvolution,
    unsubscribe,
    UnsubscribeConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runUnsubscribe = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    subscriberNftTn: string,
): Promise<Error | void> => {
    const unsubscribeConfig: UnsubscribeConfig = {
        service_nft_tn: serviceNftTn,
        subscriber_nft_tn: subscriberNftTn,
        payment_nft_tn:
            "0058dfe1620ba6aa7d460adb82f20597de2bdcbb80904724d4c03eec3e47d987",
        current_time: BigInt(Date.now()),
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
