import {
    accountValidator,
    Lucid,
    Maestro,
    serviceValidator,
    validatorToAddress,
} from "@anastasia-labs/payment-subscription-offchain";

/**
 * Helper function to set up Lucid and other environment variables once.
 */
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

    return {
        lucid,
        SUBSCRIBER_WALLET_SEED,
        MERCHANT_WALLET_SEED,
        serviceAddress,
        accountAddress,
    };
}
