import {
    CreateServiceConfig,
    createServiceProgram,
    selectUTxOs,
} from "../src/index.js";
import { Effect } from "effect";
import { LucidContext } from "./service/lucidContext.js";

type CreateServiceResult = {
    txHash: string;
    serviceConfig: CreateServiceConfig;
};

export const createServiceTestCase = (
    { lucid, users }: LucidContext,
    intervalLength: bigint = 60n * 1000n * 5n,
): Effect.Effect<CreateServiceResult, Error, never> => {
    return Effect.gen(function* () {
        lucid.selectWallet.fromSeed(users.merchant.seedPhrase);
        const address = yield* Effect.promise(() => lucid.wallet().address());
        const utxos = yield* Effect.promise(() => lucid.utxosAt(address));
        const selectedUTxOs = selectUTxOs(utxos, { ["lovelace"]: 2000000n });

        if (!selectedUTxOs || !selectedUTxOs.length) {
            console.error("No selectable UTxO found at address: " + address);
        }

        const selectedUTxO = selectedUTxOs[0];
        const serviceConfig: CreateServiceConfig = {
            selected_out_ref: selectedUTxO,
            service_fee_policyid: "",
            service_fee_assetname: "",
            service_fee: 10_000_000n,
            penalty_fee_policyid: "",
            penalty_fee_assetname: "",
            penalty_fee: 1_000_000n,
            interval_length: intervalLength,
            num_intervals: 12n,
            is_active: true,
        };

        const createServiceFlow = Effect.gen(function* (_) {
            const createServiceUnSigned = yield* createServiceProgram(
                lucid,
                serviceConfig,
            );
            const createServiceSigned = yield* Effect.promise(() =>
                createServiceUnSigned.sign.withWallet()
                    .complete()
            );
            const createServiceHash = yield* Effect.promise(() =>
                createServiceSigned.submit()
            );

            return createServiceHash;
        });

        const createServiceResult = yield* createServiceFlow.pipe(
            Effect.tapError((error) =>
                Effect.log(`Error creating Service: ${error}`)
            ),
            Effect.map((hash) => {
                return hash;
            }),
        );

        return {
            txHash: createServiceResult,
            serviceConfig,
        };
    });
};
