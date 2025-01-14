import {
    accountPolicyId,
    accountValidator,
    findCip68TokenNames,
    Lucid,
    Maestro,
    paymentPolicyId,
    paymentValidator,
    servicePolicyId,
    serviceValidator,
    tokenNameFromUTxO,
    validatorToAddress,
} from "@anastasia-labs/payment-subscription-offchain";

export async function setupLucid() {
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
    const paymentAddress = validatorToAddress(
        network,
        paymentValidator.spendPayment,
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
    const paymentUTxOs = await lucid.utxosAt(paymentAddress);

    // Find token names
    const serviceTokens = findCip68TokenNames(
        serviceUTxOs,
        merchantUTxOs,
        servicePolicyId,
    );

    const accountTokens = findCip68TokenNames(
        accountUTxOs,
        subscriberUTxOs,
        accountPolicyId,
    );

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
