import {
    accountPolicyId,
    findCip68TokenNames,
    LucidEvolution,
    updateAccount,
    UpdateAccountConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runUpdateAccount = async (
    lucid: LucidEvolution,
    accountAddress: string,
    subscriberAddress: string,
): Promise<Error | void> => {
    const accountUTxOs = await lucid.utxosAt(accountAddress);
    const subscriberUTxOs = await lucid.utxosAt(subscriberAddress);

    // const { refTokenName: accountNftTn, userTokenName: subscriberNftTn } =
    //     findCip68TokenNames(
    //         [accountUTxOs[0], subscriberUTxOs[0]],
    //         accountPolicyId,
    //     );

    console.log("accountUTxOs: ", accountUTxOs);
    console.log("subscriberUTxOs: ", subscriberUTxOs);

    const updateAccountConfig: UpdateAccountConfig = {
        new_email: "new_business@web3.ada",
        new_phone: "(288) 481-2686-999",
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
