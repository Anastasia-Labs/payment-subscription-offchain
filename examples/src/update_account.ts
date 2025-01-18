import {
    LucidEvolution,
    updateAccount,
    UpdateAccountConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runUpdateAccount = async (
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
