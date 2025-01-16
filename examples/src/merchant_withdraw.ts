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

        // Get payment datum for validation and logging
        const paymentDatum = await getPaymentValidatorDatum(paymentUTxO);
        const paymentNftTn = tokenNameFromUTxO([paymentUTxO], paymentPolicyId);
        const currentTime = BigInt(Date.now());

        const merchantWithdrawConfig: MerchantWithdrawConfig = {
            service_nft_tn:
                "000643b0002990f56b0fd73d689bd5642ea6090c3c79463c22f67b24faf598d2",
            merchant_nft_tn:
                "000de140002990f56b0fd73d689bd5642ea6090c3c79463c22f67b24faf598d2",
            payment_nft_tn:
                "00dfb41cfdb88c5d52672990fc3f257465a01ba2cca9f7b20c4c98fad1014ed5",
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
        await lucid.awaitTx(merchantWithdrawTxHash);

        console.log(`Merchant Withdraw Successful: ${merchantWithdrawTxHash}`);
    } catch (error) {
        console.error("Failed to withdraw by Merchant:", error);
        throw error;
    }
};
