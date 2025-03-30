import {
    LucidEvolution,
    unsubscribe,
    UnsubscribeConfig,
} from "../index.js";
import { makeLucidContext } from "./lucid.js";

const runUnsubscribe = async (
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
        const unsubscribeUnsigned = await unsubscribe(lucid, unsubscribeConfig);
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

const lucidContext = await makeLucidContext()
const lucid = lucidContext.lucid
lucid.selectWallet.fromSeed(lucidContext.users.subscriber.seedPhrase)
await runUnsubscribe(lucid, "000643b00088fe789530721d31464ead0813b7c75651cc019c68912064bbbb82", "000de14001beb6d49450bbbad6dc2ad59bffc8601da5cce7e0115f373bfe4101")
