import {
    LucidEvolution,
    updateAccount,
    UpdateAccountConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runUpdateAccount = async (
    lucid: LucidEvolution,
): Promise<Error | void> => {
    const updateAccountConfig: UpdateAccountConfig = {
        new_email: "new_business@web3.ada",
        new_phone: "(288) 481-2686-999",
        account_nft_tn:
            "000643b0004916b57591943940e8c3a1d9dd55bb790752f2200eaa43fe1d61da",
        subscriber_nft_tn:
            "000de140004916b57591943940e8c3a1d9dd55bb790752f2200eaa43fe1d61da",
    };

    // Update Service
    try {
        const updateServiceUnsigned = await updateAccount(
            lucid,
            updateAccountConfig,
        );
        const updateAccountSigned = await updateServiceUnsigned.sign
            .withWallet()
            .complete();
        const updateAccountHash = await updateAccountSigned.submit();

        console.log(`Account updated successfully: ${updateAccountHash}`);
    } catch (error) {
        console.error("Failed to update Account:", error);
    }
};
