import {
    LucidEvolution,
    subscriberWithdraw,
    SubscriberWithdrawConfig,
} from "../index.js";
import { makeLucidContext } from "./lucid.js";

const runSubscriberWithdraw = async (
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

const lucidContext = await makeLucidContext()
const lucid = lucidContext.lucid
lucid.selectWallet.fromSeed(lucidContext.users.subscriber.seedPhrase)
await runSubscriberWithdraw(lucid, "000643b0002304f2370d0212543199071d5f783f0bbe716d28292e1b0c02f91e", "000de14000394b21456beff60a682287bfad204e9952cf7104d278470c5cf9da")
