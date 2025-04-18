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
await runInitSubscription(lucid, "000643b0016a4891d308f52197c69b219a9ee2e3a9302a093db030c05fb521bf", "000de140018e0591f38a6369e96bfefd14fb0b0999053daf3efc503c015139a2")
