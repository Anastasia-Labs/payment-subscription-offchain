import {
    accountPolicyId,
    ADA,
    findCip68TokenNames,
    getServiceValidatorDatum,
    initiateSubscription,
    InitPaymentConfig,
    LucidEvolution,
    servicePolicyId,
} from "@anastasia-labs/payment-subscription-offchain";

export const runInitSubscription = async (
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

    const serviceData = await getServiceValidatorDatum(serviceUTxOs);
    const currentTime = BigInt(Date.now());

    const interval_amount = serviceData[0].service_fee_qty;
    const interval_length = serviceData[0].interval_length;
    const num_intervals = serviceData[0].num_intervals;
    const subscription_end = currentTime +
        interval_length * num_intervals;

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

    const paymentConfig: InitPaymentConfig = {
        service_nft_tn: serviceNftTn,
        account_nft_tn: subscriberNftTn,
        subscription_fee: ADA,
        total_subscription_fee: interval_amount * num_intervals,
        subscription_start: currentTime + BigInt(1000 * 60),
        subscription_end: subscription_end + BigInt(1000 * 60),
        interval_length: interval_length, //30n * 24n * 60n * 60n * 1000n,
        interval_amount: interval_amount,
        num_intervals: num_intervals,
        last_claimed: 0n,
        penalty_fee: ADA,
        penalty_fee_qty: serviceData[0].penalty_fee_qty,
        minimum_ada: serviceData[0].minimum_ada,
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
