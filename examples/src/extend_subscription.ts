import {
    ExtendPaymentConfig,
    extendSubscription,
    LucidEvolution,
} from "@anastasia-labs/payment-subscription-offchain";

export const runExtendSubscription = async (
    lucid: LucidEvolution,
): Promise<Error | void> => {
    const extendPaymentConfig: ExtendPaymentConfig = {
        service_nft_tn:
            "000643b000b306620f9429f6b25941a392feef614b9bbcd18435447499e2effc",
        subscriber_nft_tn:
            "000de14000f502a27c73b12ab74a86af46a71ff2f3cdc39ec600928f6aaa450c",
        payment_nft_tn:
            "0069f95d11e42670cbbfb85024e0c5a230b792f5c96cc9b98875fb19e33cce98",
        extension_intervals: 1n,
    };

    // Extend Subscription
    try {
        const extendUnsigned = await extendSubscription(
            lucid,
            extendPaymentConfig,
        );
        const extendSigned = await extendUnsigned.sign
            .withWallet()
            .complete();
        const extendTxHash = await extendSigned.submit();

        console.log(`Service extended successfully: ${extendTxHash}`);
    } catch (error) {
        console.error("Failed to extend service:", error);
    }
};
