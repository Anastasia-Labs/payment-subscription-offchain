import { bytesToHex } from "@noble/hashes/utils";
import { sha256 } from "@noble/hashes/sha256";
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
        new_email_hash: bytesToHex(sha256("new_business@web3.ada")),
        new_phone_hash: bytesToHex(sha256("(288) 481-2686-999")),
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
await runUpdateAccount(lucid, "000643b000394b21456beff60a682287bfad204e9952cf7104d278470c5cf9da", "000de14000394b21456beff60a682287bfad204e9952cf7104d278470c5cf9da")

