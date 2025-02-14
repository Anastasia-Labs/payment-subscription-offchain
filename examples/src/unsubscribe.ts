import {
    getMultiValidator,
    getPaymentValidatorDatum,
    LucidEvolution,
    paymentScript,
    unsubscribe,
    UnsubscribeConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runUnsubscribe = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    subscriberNftTn: string,
): Promise<Error | void> => {
    const unsubscribeConfig: UnsubscribeConfig = {
        subscriber_nft_tn: subscriberNftTn,
        current_time: BigInt(Date.now()),
    };

    // Unsubscribe
    try {
        const paymentValidator = getMultiValidator(lucid, paymentScript);
        const paymentUTxOs = await lucid.utxosAt(
            paymentValidator.spendValAddress,
        );

        // Find the Payment UTxO by checking the datum
        const results = await Promise.all(
            paymentUTxOs.map(async (utxo) => {
                try {
                    const datum = await getPaymentValidatorDatum(utxo);
                    return datum[0].service_nft_tn === serviceNftTn &&
                            datum[0].subscriber_nft_tn === subscriberNftTn
                        ? utxo
                        : null;
                } catch {
                    return null;
                }
            }),
        );

        const unsubscribeUnsigned = await unsubscribe(
            lucid,
            unsubscribeConfig,
        );
        const unsubscribeSigned = await unsubscribeUnsigned.sign
            .withWallet()
            .complete();
        const unsubscribeTxHash = await unsubscribeSigned.submit();

        console.log(`Submitting ...`);
        await lucid.awaitTx(unsubscribeTxHash);

        console.log(
            `Unsubscribed successfully: ${unsubscribeTxHash}`,
        );
    } catch (error) {
        console.error("Failed to unsubscribe:", error);
    }
};
