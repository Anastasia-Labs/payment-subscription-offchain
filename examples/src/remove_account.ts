import {
    LucidEvolution,
    removeAccount,
    RemoveAccountConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runRemoveAccount = async (
    lucid: LucidEvolution,
    accountNftTn: string,
    subscriberNftTn: string,
): Promise<Error | void> => {
    const removeAccountConfig: RemoveAccountConfig = {
        account_nft_tn: accountNftTn,
        subscriber_nft_tn: subscriberNftTn,
    };

    // Remove Account
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
