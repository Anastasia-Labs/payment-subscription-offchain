import {
    LucidEvolution,
    subscriberWithdraw,
    SubscriberWithdrawConfig,
} from "../index.js";

export const runSubscriberWithdraw = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    subscriberNftTn: string,
): Promise<Error | void> => {
    const subscriberWithdrawConfig: SubscriberWithdrawConfig = {
        service_nft_tn: serviceNftTn,
        subscriber_nft_tn: subscriberNftTn,
    };

    try {
        const subscriberWithdrawUnsigned = await subscriberWithdraw(
            lucid,
            subscriberWithdrawConfig,
        );
        const subscriberWithdrawSigned = await subscriberWithdrawUnsigned.sign
            .withWallet()
            .complete();
        const subscriberWithdrawTxHash = await subscriberWithdrawSigned
            .submit();

        console.log(`Submitting ...`);
        await lucid.awaitTx(subscriberWithdrawTxHash);

        console.log(
            `Service created successfully: ${subscriberWithdrawTxHash}`,
        );
    } catch (error) {
        console.error("Failed to create service:", error);
    }
};
