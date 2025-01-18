import {
    getMultiValidator,
    getPaymentValidatorDatum,
    LucidEvolution,
    merchantWithdraw,
    MerchantWithdrawConfig,
    paymentPolicyId,
    paymentScript,
    tokenNameFromUTxO,
} from "@anastasia-labs/payment-subscription-offchain";

export const runMerchantWithdraw = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    merchantNftTn: string,
    subscriberNftTn: string,
): Promise<Error | void> => {
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

        const paymentUTxO = results.find((utxo) => utxo !== null);

        if (!paymentUTxO) {
            throw new Error("No active subscription found");
        }

        const paymentNftTn = tokenNameFromUTxO([paymentUTxO], paymentPolicyId);
        const currentTime = BigInt(Date.now());

        const merchantWithdrawConfig: MerchantWithdrawConfig = {
            service_nft_tn: serviceNftTn,
            merchant_nft_tn: merchantNftTn,
            payment_nft_tn: paymentNftTn,
            current_time: currentTime,
        };

        console.log("Merchant Withdraw Config:", merchantWithdrawConfig);

        const merchantWithdrawUnsigned = await merchantWithdraw(
            lucid,
            merchantWithdrawConfig,
        );
        const merchantWithdrawSigned = await merchantWithdrawUnsigned.sign
            .withWallet()
            .complete();
        const merchantWithdrawTxHash = await merchantWithdrawSigned.submit();

        console.log(`Submitting ...`);
        await lucid.awaitTx(merchantWithdrawTxHash);

        console.log(`Merchant Withdraw Successful: ${merchantWithdrawTxHash}`);
    } catch (error) {
        console.error("Failed to withdraw by Merchant:", error);
        throw error;
    }
};
