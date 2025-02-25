import {
    ExtendPaymentConfig,
    extendSubscription,
    LucidEvolution,
} from "../index.js";

export const runExtendSubscription = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    subscriberNftTn: string,
): Promise<Error | void> => {
    const extendPaymentConfig: ExtendPaymentConfig = {
        service_nft_tn: serviceNftTn,
        subscriber_nft_tn: subscriberNftTn,
        extension_intervals: 1n,
    };
    try {
        const extendUnsigned = await extendSubscription(
            lucid,
            extendPaymentConfig,
        );
        const extendSigned = await extendUnsigned.sign
            .withWallet()
            .complete();
        const extendTxHash = await extendSigned.submit();

        console.log(`Submitting ...`);
        await lucid.awaitTx(extendTxHash);

        console.log(`Service extended successfully: ${extendTxHash}`);
    } catch (error) {
        console.error("Failed to extend service:", error);
    }
};
