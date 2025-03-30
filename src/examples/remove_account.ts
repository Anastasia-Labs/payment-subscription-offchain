import {
    LucidEvolution,
    removeAccount,
    RemoveAccountConfig,
} from "../index.js";
import { makeLucidContext } from "./lucid.js";

const runRemoveAccount = async (
    lucid: LucidEvolution,
    accountNftTn: string,
    subscriberNftTn: string,
): Promise<Error | void> => {
    const removeAccountConfig: RemoveAccountConfig = {
        account_nft_tn: accountNftTn,
        subscriber_nft_tn: subscriberNftTn,
    };

    try {
        const removeAccountUnsigned = await removeAccount(
            lucid,
            removeAccountConfig,
        );
        const removeAccountSigned = await removeAccountUnsigned.sign
            .withWallet()
            .complete();
        const removeAccountHash = await removeAccountSigned.submit();

        console.log(`Submitting ...`);
        await lucid.awaitTx(removeAccountHash);

        console.log(`Account removed successfully: ${removeAccountHash}`);
    } catch (error) {
        console.error("Failed to remove Account:", error);
    }
};

const lucidContext = await makeLucidContext()
const lucid = lucidContext.lucid
lucid.selectWallet.fromSeed(lucidContext.users.subscriber.seedPhrase)
await runRemoveAccount(lucid, "000643b000394b21456beff60a682287bfad204e9952cf7104d278470c5cf9da", "000de14000394b21456beff60a682287bfad204e9952cf7104d278470c5cf9da")
