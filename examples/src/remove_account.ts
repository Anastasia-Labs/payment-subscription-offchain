import {
    accountPolicyId,
    findCip68TokenNames,
    LucidEvolution,
    removeAccount,
    RemoveAccountConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runRemoveAccount = async (
    lucid: LucidEvolution,
    accountAddress: string,
    subscriberAddress: string,
): Promise<Error | void> => {
    const accountUTxOs = await lucid.utxosAt(accountAddress);
    const subscriberUTxOs = await lucid.utxosAt(subscriberAddress);

    const { refTokenName: accountNftTn, userTokenName: subscriberNftTn } =
        findCip68TokenNames(
            [...accountUTxOs, ...subscriberUTxOs],
            accountPolicyId,
        );

    const removeAccountConfig: RemoveAccountConfig = {
        account_nft_tn:
            "000643b000e42f7c1fc58d03f14017f2b8db108507b4c439b6b3c9e4b04c933f",
        subscriber_nft_tn:
            "000de14000e42f7c1fc58d03f14017f2b8db108507b4c439b6b3c9e4b04c933f",
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

        console.log(`Account removed successfully: ${removeAccountHash}`);
    } catch (error) {
        console.error("Failed to remove Account:", error);
    }
};
