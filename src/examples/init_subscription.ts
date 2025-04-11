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
await runInitSubscription(lucid, "000643b0006d5fd6a8ebe94e12ea74d46ee2bd5621a8e8d55df0bfa9419ed7ed", "000de14002cfa3e99ad2d48c991d02db0adedf4b8b08ac72746e5db6a3938c57")
