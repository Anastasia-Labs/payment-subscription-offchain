import {
    initiateSubscription,
    InitPaymentConfig,
    LucidEvolution,
} from "../index.js";
import { makeLucidContext } from "./lucid.js";

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

const runInitSubscription = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    subscriberNftTn: string,
): Promise<Error | void> => {
    const paymentConfig: InitPaymentConfig = {
        service_nft_tn: serviceNftTn,
        subscriber_nft_tn: subscriberNftTn,
        subscription_start: BigInt(Date.now() + 3 * MINUTES),
    };

    try {
        const initSubscriptionUnsigned = await initiateSubscription(lucid, paymentConfig);
        const initSubscriptionSigned = await initSubscriptionUnsigned.sign
            .withWallet()
            .complete();
        const initSubscriptionHash = await initSubscriptionSigned.submit();

        console.log(`Submitting ...`);
        await lucid.awaitTx(initSubscriptionHash);

        console.log(
            `Subscription initiated successfully: ${initSubscriptionHash}`,
        );
    } catch (error) {
        console.error("Failed to initiate subscription:", error);
    }
};

const lucidContext = await makeLucidContext()
const lucid = lucidContext.lucid
lucid.selectWallet.fromSeed(lucidContext.users.subscriber.seedPhrase)
await runInitSubscription(lucid, "000643b00088fe789530721d31464ead0813b7c75651cc019c68912064bbbb82", "000de14001beb6d49450bbbad6dc2ad59bffc8601da5cce7e0115f373bfe4101")
