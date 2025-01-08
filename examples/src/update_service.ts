import {
    Data,
    getServiceValidatorDatum,
    LucidEvolution,
    ServiceDatum,
    updateService,
    UpdateServiceConfig,
} from "@anastasia-labs/payment-subscription-offchain";

export const runUpdateService = async (
    lucid: LucidEvolution,
    serviceAddress: string,
    MERCHANT_WALLET_SEED: string,
): Promise<Error | void> => {
    if (!MERCHANT_WALLET_SEED) {
        throw new Error("Missing required environment variables.");
    }

    const serviceUTxOs = await lucid.utxosAt(serviceAddress);

    // Get utxos where is_active in datum is set to true
    const activeServiceUTxOs = serviceUTxOs.filter((utxo) => {
        if (!utxo.datum) return false;
        const datum = Data.from<ServiceDatum>(utxo.datum, ServiceDatum);
        return datum.is_active === true;
    });

    const serviceData = await getServiceValidatorDatum(activeServiceUTxOs);

    const updateServiceConfig: UpdateServiceConfig = {
        service_nft_tn:
            "000643b000ec9e1a5a9f39cc96d2f5c51f22d01de412428772a77ac176871b9b",
        merchant_nft_tn:
            "000de14000ec9e1a5a9f39cc96d2f5c51f22d01de412428772a77ac176871b9b",
        new_service_fee: serviceData[0].service_fee,
        new_service_fee_qty: 9_500_000n,
        new_penalty_fee: serviceData[0].penalty_fee,
        new_penalty_fee_qty: 1_000_000n,
        new_interval_length: 1n,
        new_num_intervals: 12n,
        new_minimum_ada: 2_000_000n,
        is_active: serviceData[0].is_active,
    };

    // Update Service
    try {
        lucid.selectWallet.fromSeed(MERCHANT_WALLET_SEED);
        const updateServiceUnsigned = await updateService(
            lucid,
            updateServiceConfig,
        );
        const initTxSigned = await updateServiceUnsigned.sign.withWallet()
            .complete();
        const initTxHash = await initTxSigned.submit();

        console.log(`Service updated successfully: ${initTxHash}`);
    } catch (error) {
        console.error("Failed to update service:", error);
    }
};
