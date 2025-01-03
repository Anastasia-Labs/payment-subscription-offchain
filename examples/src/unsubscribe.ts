import {
    accountPolicyId,
    findCip68TokenNames,
    LucidEvolution,
    servicePolicyId,
    unsubscribe,
    UnsubscribeConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runUnsubscribe = async (
    lucid: LucidEvolution,
    serviceAddress: string,
    merchantAddress: string,
    accountAddress: string,
    subscriberAddress: string,
): Promise<Error | void> => {
    const serviceUTxOs = await lucid.utxosAt(serviceAddress);
    const merchantUTxOs = await lucid.utxosAt(merchantAddress);
    const accountUTxOs = await lucid.utxosAt(accountAddress);
    const subscriberUTxOs = await lucid.utxosAt(subscriberAddress);

    const currentTime = BigInt(Date.now());

    const { refTokenName: serviceNftTn, userTokenName: merchantNftTn } =
        findCip68TokenNames(
            [serviceUTxOs[0], merchantUTxOs[0]],
            servicePolicyId,
        );

    const { refTokenName: accountNftTn, userTokenName: subscriberNftTn } =
        findCip68TokenNames(
            [accountUTxOs[0], subscriberUTxOs[0]],
            accountPolicyId,
        );

    const unsubscribeConfig: UnsubscribeConfig = {
        service_nft_tn: serviceNftTn,
        subscriber_nft_tn: subscriberNftTn,
        current_time: currentTime,
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
