import {
    LucidEvolution,
    removeAccount,
} from "@anastasia-labs/payment-subscription-offchain";

export const runRemoveAccount = async (
    lucid: LucidEvolution,
): Promise<Error | void> => {
    // Remove Account
    try {
        const removeAccountUnsigned = await removeAccount(
            lucid,
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
