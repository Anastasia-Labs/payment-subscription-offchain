import {
    fromText,
    LucidEvolution,
    merchantWithdraw,
    MerchantWithdrawConfig,
    PAYMENT_TOKEN_NAME,
} from "../index.js";
import { makeLucidContext } from "./lucid.js";

const runMerchantWithdraw = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    merchantNftTn: string,
    subscriberNftTn: string,
): Promise<Error | void> => {
    try {
        const paymentNftTn = fromText(PAYMENT_TOKEN_NAME)
        const currentTime = BigInt(Date.now());

        const merchantWithdrawConfig: MerchantWithdrawConfig = {
            service_nft_tn: serviceNftTn,
            subscriber_nft_tn: subscriberNftTn,
            merchant_nft_tn: merchantNftTn,
            payment_nft_tn: paymentNftTn,
            current_time: currentTime,
        };

        console.log("Merchant Withdraw Config:", merchantWithdrawConfig);

        const merchantWithdrawUnsigned = await merchantWithdraw(lucid, merchantWithdrawConfig);
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

const lucidContext = await makeLucidContext()
const lucid = lucidContext.lucid
lucid.selectWallet.fromSeed(lucidContext.users.merchant.seedPhrase)
await runMerchantWithdraw(lucid, "000643b0002304f2370d0212543199071d5f783f0bbe716d28292e1b0c02f91e", "000de140002304f2370d0212543199071d5f783f0bbe716d28292e1b0c02f91e", "000de14000394b21456beff60a682287bfad204e9952cf7104d278470c5cf9da")
