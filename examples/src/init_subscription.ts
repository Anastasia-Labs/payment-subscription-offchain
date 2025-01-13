import {
    initiateSubscription,
    InitPaymentConfig,
    LucidEvolution,
} from "@anastasia-labs/payment-subscription-offchain";

export const runInitSubscription = async (
    lucid: LucidEvolution,
): Promise<Error | void> => {
    const paymentConfig: InitPaymentConfig = {
        service_nft_tn:
            "000643b00072210afcd6d8c4d4794e74b602f2cbb81bd16c4ad4605720c3d4a1",
        subscriber_nft_tn:
            "000de140004916b57591943940e8c3a1d9dd55bb790752f2200eaa43fe1d61da",
        num_intervals: 3n,
    };

    // Create Service
    try {
        const initSubscriptionUnsigned = await initiateSubscription(
            lucid,
            paymentConfig,
        );
        const initSubscriptionSigned = await initSubscriptionUnsigned.sign
            .withWallet()
            .complete();
        const initSubscriptionHash = await initSubscriptionSigned.submit();

        console.log(
            `Subscription initiated successfully: ${initSubscriptionHash}`,
        );
    } catch (error) {
        console.error("Failed to initiate subscription:", error);
    }
};
