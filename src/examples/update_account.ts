import {
    LucidEvolution,
    updateAccount,
    UpdateAccountConfig,
} from "../index.js";
import { makeLucidContext } from "./lucid.js";

const runUpdateAccount = async (
    lucid: LucidEvolution,
    accountNftTn: string,
    subscriberNftTn: string,
): Promise<Error | void> => {
    const updateAccountConfig: UpdateAccountConfig = {
        new_email: "new_business@web3.ada",
        new_phone: "(288) 481-2686-999",
        account_nft_tn: accountNftTn,
        subscriber_nft_tn: subscriberNftTn,
    };

    // Update Account
    try {
        const updateServiceUnsigned = await updateAccount(
            lucid,
            updateAccountConfig,
        );
        const updateAccountSigned = await updateServiceUnsigned.sign
            .withWallet()
            .complete();
        const updateAccountHash = await updateAccountSigned.submit();

        console.log(`Submitting ...`);
        await lucid.awaitTx(updateAccountHash);

        console.log(`Account updated successfully: ${updateAccountHash}`);
    } catch (error) {
        console.error("Failed to update Account:", error);
    }
};

const lucidContext = await makeLucidContext()
const lucid = lucidContext.lucid
lucid.selectWallet.fromSeed(lucidContext.users.subscriber.seedPhrase)
await runUpdateAccount(lucid, "000643b002cfa3e99ad2d48c991d02db0adedf4b8b08ac72746e5db6a3938c57", "000de14002cfa3e99ad2d48c991d02db0adedf4b8b08ac72746e5db6a3938c57")

