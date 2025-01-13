import {
    initiateSubscription,
    InitPaymentConfig,
    LucidEvolution,
} from "@anastasia-labs/payment-subscription-offchain";

//TODO: Store token names in a local storage (JSON File) while initiating
export const runInitSubscription = async (
    lucid: LucidEvolution,
): Promise<Error | void> => {
    const paymentConfig: InitPaymentConfig = {
        service_nft_tn:
            "000643b000c8623b17d87945ce4c3846b0b4cde072602b8ce166c94127fddb8e",
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
