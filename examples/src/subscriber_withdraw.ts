import {
    accountPolicyId,
    Data,
    findCip68TokenNames,
    LucidEvolution,
    ServiceDatum,
    servicePolicyId,
    subscriberWithdraw,
    SubscriberWithdrawConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runSubscriberWithdraw = async (
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

    const { refTokenName: serviceNftTn, userTokenName: merchantNftTn } =
        findCip68TokenNames(
            serviceUTxOs,
            merchantUTxOs,
            servicePolicyId,
        );

    const { refTokenName: accountNftTn, userTokenName: subscriberNftTn } =
        findCip68TokenNames(
            accountUTxOs,
            subscriberUTxOs,
            accountPolicyId,
        );

    // Get utxos where is_active in datum is set to true
    const inActiveServiceUTxOs = serviceUTxOs.filter((utxo) => {
        if (!utxo.datum) return false;

        const datum = Data.from<ServiceDatum>(utxo.datum, ServiceDatum);

        return datum.is_active === false;
    });

    const subscriberWithdrawConfig: SubscriberWithdrawConfig = {
        service_nft_tn: serviceNftTn,
        subscriber_nft_tn: subscriberNftTn,
        service_utxos: inActiveServiceUTxOs,
    };

    // Merchant Withdraw
    try {
        const merchantWithdrawUnsigned = await subscriberWithdraw(
            lucid,
            subscriberWithdrawConfig,
        );
        const merchantWithdrawSigned = await merchantWithdrawUnsigned.sign
            .withWallet()
            .complete();
        const merchantWithdrawTxHash = await merchantWithdrawSigned.submit();

        console.log(`Service created successfully: ${merchantWithdrawTxHash}`);
    } catch (error) {
        console.error("Failed to create service:", error);
    }
};
