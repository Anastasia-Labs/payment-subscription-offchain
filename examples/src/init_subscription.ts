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
            "000643b001211d1f32d1cb5e4801ae7f2a413300a4d0035df831e5286f9dadaa",
        subscriber_nft_tn:
            "000de14000e42f7c1fc58d03f14017f2b8db108507b4c439b6b3c9e4b04c933f",
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
