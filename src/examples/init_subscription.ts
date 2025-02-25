import {
    initiateSubscription,
    InitPaymentConfig,
    LucidEvolution,
} from "../index.js";

export const runInitSubscription = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    subscriberNftTn: string,
): Promise<Error | void> => {
    const paymentConfig: InitPaymentConfig = {
        service_nft_tn: serviceNftTn,
        subscriber_nft_tn: subscriberNftTn,
        num_intervals: 3n,
        subscription_start: BigInt(lucid.currentSlot()) + 60n * 1000n,
    };

    try {
        const initSubscriptionUnsigned = await initiateSubscription(lucid, paymentConfig);
        const initSubscriptionSigned = await initSubscriptionUnsigned.sign
            .withWallet()
            .complete();
        const initSubscriptionHash = await initSubscriptionSigned.submit();

        console.log(`Submitting ...`);
        await lucid.awaitTx(initSubscriptionHash);

        console.log(
            `Subscription initiated successfully: ${initSubscriptionHash}`,
        );
    } catch (error) {
        console.error("Failed to initiate subscription:", error);
    }
};
