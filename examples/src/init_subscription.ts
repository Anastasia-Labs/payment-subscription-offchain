import {
    initiateSubscription,
    InitPaymentConfig,
    LucidEvolution,
} from "@anastasia-labs/payment-subscription-offchain";

//TODO: Store token names in a local storage (JSON File) while initiating
export const runInitSubscription = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    subscriberNftTn: string,
): Promise<Error | void> => {
    const paymentConfig: InitPaymentConfig = {
        service_nft_tn: serviceNftTn,
        subscriber_nft_tn: subscriberNftTn,
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
