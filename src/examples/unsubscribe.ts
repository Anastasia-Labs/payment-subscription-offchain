import {
    LucidEvolution,
    unsubscribe,
    UnsubscribeConfig,
} from "../index.js";

export const runUnsubscribe = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    subscriberNftTn: string,
): Promise<Error | void> => {
    const unsubscribeConfig: UnsubscribeConfig = {
        service_nft_tn: serviceNftTn,
        subscriber_nft_tn: subscriberNftTn,
        current_time: BigInt(Date.now()),
    };

    try {
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
