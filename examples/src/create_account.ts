import {
    createAccount,
    CreateAccountConfig,
    LucidEvolution,
} from "@anastasia-labs/payment-subscription-offchain";

export const runCreateAccount = async (
    lucid: LucidEvolution,
): Promise<Error | void> => {
    const currentTime = BigInt(Date.now());

    const accountConfig: CreateAccountConfig = {
        email: "business@web3.ada",
        phone: "288-481-2686",
        account_created: currentTime,
    };

    // Create Account
    try {
        const createAccountUnsigned = await createAccount(lucid, accountConfig);
        const createAccountSigned = await createAccountUnsigned.sign
            .withWallet()
            .complete();
        const createAccountHash = await createAccountSigned.submit();

        console.log(`Account created successfully: ${createAccountHash}`);
    } catch (error) {
        console.error("Failed to create Account:", error);
    }
};
