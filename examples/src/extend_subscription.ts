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
            "000643b001211d1f32d1cb5e4801ae7f2a413300a4d0035df831e5286f9dadaa",
        subscriber_nft_tn:
            "000de14000e42f7c1fc58d03f14017f2b8db108507b4c439b6b3c9e4b04c933f",
        payment_nft_tn:
            "0054f24765b4a49ffd8165cba6924be886c97a81cdc7e838caef286595aedc54",
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
