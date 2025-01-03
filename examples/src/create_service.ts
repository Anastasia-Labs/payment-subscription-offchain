import {
    ADA,
    createService,
    CreateServiceConfig,
    LucidEvolution,
} from "@anastasia-labs/payment-subscription-offchain";

export const runCreateService = async (
    lucid: LucidEvolution,
    MERCHANT_WALLET_SEED: string,
): Promise<Error | void> => {
    if (!MERCHANT_WALLET_SEED) {
        throw new Error("Missing required environment variables.");
    }

    const serviceConfig: CreateServiceConfig = {
        service_fee: ADA,
        service_fee_qty: 10_000_000n,
        penalty_fee: ADA,
        penalty_fee_qty: 1_000_000n,
        interval_length: 30n * 24n * 60n * 60n * 1000n, // 30 days in milliseconds,
        num_intervals: 12n,
        minimum_ada: 2_000_000n,
        is_active: true,
    };

    // Create Service
    try {
        lucid.selectWallet.fromSeed(MERCHANT_WALLET_SEED);
        const createServiceUnSigned = await createService(lucid, serviceConfig);
        const initTxSigned = await createServiceUnSigned.sign.withWallet()
            .complete();
        const initTxHash = await initTxSigned.submit();

        console.log(`Service created successfully: ${initTxHash}`);
    } catch (error) {
        console.error("Failed to create service:", error);
    }
};
