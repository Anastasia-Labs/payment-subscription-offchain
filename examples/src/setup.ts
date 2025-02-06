import {
    accountPolicyId,
    accountValidator,
    findCip68TokenNames,
    Lucid,
    Maestro,
    paymentValidator,
    servicePolicyId,
    serviceValidator,
    validatorToAddress,
} from "@anastasia-labs/payment-subscription-offchain";

export async function setupLucid(command: "create" | "other" = "other") {
    const API_KEY = process.env.API_KEY!;
    const SUBSCRIBER_WALLET_SEED = process.env.SUBSCRIBER_WALLET_SEED!;
    const MERCHANT_WALLET_SEED = process.env.MERCHANT_WALLET_SEED!;

    if (!API_KEY || !SUBSCRIBER_WALLET_SEED || !MERCHANT_WALLET_SEED) {
        throw new Error("Missing required env variables.");
    }

    // Instantiate Lucid with your Maestro config
    const lucid = await Lucid(
        new Maestro({
            network: "Preprod",
            apiKey: API_KEY,
            turboSubmit: false,
        }),
        "Preprod",
    );

    const network = lucid.config().network;
    if (!network) {
        throw new Error("Invalid Network selection");
    }

    // Compute the script addresses
    const serviceAddress = validatorToAddress(
        network,
        serviceValidator.spendService,
    );
    const accountAddress = validatorToAddress(
        network,
        accountValidator.spendAccount,
    );

    // Get merchant and subscriber addresses
    lucid.selectWallet.fromSeed(MERCHANT_WALLET_SEED);
    const merchantAddress = await lucid.wallet().address();

    lucid.selectWallet.fromSeed(SUBSCRIBER_WALLET_SEED);
    const subscriberAddress = await lucid.wallet().address();

    // Get UTxOs
    const serviceUTxOs = await lucid.utxosAt(serviceAddress);
    const merchantUTxOs = await lucid.utxosAt(merchantAddress);
    const accountUTxOs = await lucid.utxosAt(accountAddress);
    const subscriberUTxOs = await lucid.utxosAt(subscriberAddress);

    let serviceTokens: { refTokenName: string; userTokenName: string } = {
        refTokenName: "",
        userTokenName: "",
    };
    let accountTokens: { refTokenName: string; userTokenName: string } = {
        refTokenName: "",
        userTokenName: "",
    };
    if (command !== "create") {
        // Find token names
        serviceTokens = findCip68TokenNames(
            serviceUTxOs,
            merchantUTxOs,
            servicePolicyId,
        );

        if (
            !serviceTokens || !serviceTokens.refTokenName ||
            !serviceTokens.userTokenName
        ) {
            throw new Error(
                "No valid service tokens found. Have you created a service first?",
            );
        }

        accountTokens = findCip68TokenNames(
            accountUTxOs,
            subscriberUTxOs,
            accountPolicyId,
        );

        if (
            !accountTokens || !accountTokens.refTokenName ||
            !accountTokens.userTokenName
        ) {
            throw new Error(
                "No valid account tokens found. Have you created an account first?",
            );
        }

        // Validate that the found tokens match the expected format
        console.log("Found Service Tokens:", {
            ref: serviceTokens.refTokenName,
            user: serviceTokens.userTokenName,
        });
        console.log("Found Account Tokens:", {
            ref: accountTokens.refTokenName,
            user: accountTokens.userTokenName,
        });
    }

    return {
        lucid,
        SUBSCRIBER_WALLET_SEED,
        MERCHANT_WALLET_SEED,
        serviceAddress,
        accountAddress,
        merchantAddress,
        subscriberAddress,
        tokenNames: {
            serviceNftTn: serviceTokens.refTokenName,
            merchantNftTn: serviceTokens.userTokenName,
            accountNftTn: accountTokens.refTokenName,
            subscriberNftTn: accountTokens.userTokenName,
        },
    };
}
function initializeValidators() {
    throw new Error("Function not implemented.");
}
