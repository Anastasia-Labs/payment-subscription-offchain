import {
    accountPolicyId,
    ExtendPaymentConfig,
    extendSubscription,
    findCip68TokenNames,
    LucidEvolution,
} from "@anastasia-labs/payment-subscription-offchain";

export const runExtendSubscription = async (
    lucid: LucidEvolution,
    accountAddress: string,
    subscriberAddress: string,
): Promise<Error | void> => {
    const accountUTxOs = await lucid.utxosAt(accountAddress);
    const subscriberUTxOs = await lucid.utxosAt(subscriberAddress);

    const { refTokenName: accountNftTn, userTokenName: subscriberNftTn } =
        findCip68TokenNames(
            [accountUTxOs[0], subscriberUTxOs[0]],
            accountPolicyId,
        );

    const extendPaymentConfig: ExtendPaymentConfig = {
        subscriber_nft_tn: subscriberNftTn,
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
