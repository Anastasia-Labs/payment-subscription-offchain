import {
    ADA,
    createService,
    CreateServiceConfig,
    LucidEvolution,
} from "../index.js";
import { makeLucidContext } from "./lucid.js";

const runCreateService = async (
    lucid: LucidEvolution,
): Promise<Error | void> => {
    try {
        const utxos = await lucid.wallet().getUtxos()
        const serviceConfig: CreateServiceConfig = {
            selected_out_ref: utxos[0],
            service_fee_policyid: ADA.policyId,
            service_fee_assetname: ADA.assetName,
            service_fee: 10_000_000n,
            penalty_fee_policyid: ADA.policyId,
            penalty_fee_assetname: ADA.assetName,
            penalty_fee: 1_000_000n,
            interval_length:  5n * 60n * 1000n, // 30n * 24n * 60n * 60n * 1000n, // 30 days
            num_intervals: 12n,
            is_active: true,
        };

        console.log("Creating service with config:", serviceConfig);

        const createServiceUnSigned = await createService(lucid, serviceConfig);
        const createServiceTxSigned = await createServiceUnSigned.sign
            .withWallet()
            .complete();
        const createServiceTxHash = await createServiceTxSigned.submit();

        console.log(`Submitting ...`);
        await lucid.awaitTx(createServiceTxHash);

        console.log(`Service created successfully: ${createServiceTxHash}`);
    } catch (error) {
        console.error("Failed to create service:", error);
    }
};

const lucidContext = await makeLucidContext()
const lucid = lucidContext.lucid
lucid.selectWallet.fromSeed(lucidContext.users.merchant.seedPhrase)
await runCreateService(lucid)
