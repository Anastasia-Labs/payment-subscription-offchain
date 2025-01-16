import {
    ADA,
    CreateServiceConfig,
    createServiceProgram,
} from "../src/index.js";
import { Effect } from "effect";
import { LucidContext } from "./service/lucidContext.js";
import { serviceScript } from "../src/core/validators/constants.js";

type CreateServiceResult = {
    txHash: string;
    serviceConfig: CreateServiceConfig;
};

export const createServiceTestCase = (
    { lucid, users }: LucidContext,
): Effect.Effect<CreateServiceResult, Error, never> => {
    return Effect.gen(function* () {
        lucid.selectWallet.fromSeed(users.merchant.seedPhrase);

        const serviceConfig: CreateServiceConfig = {
            service_fee: ADA,
            service_fee_qty: 10_000_000n,
            penalty_fee: ADA,
            penalty_fee_qty: 1_000_000n,
            interval_length: 60n * 1000n * 2n, //30n * 24n * 60n * 60n * 1000n, // 30 days in milliseconds,
            num_intervals: 12n,
            minimum_ada: 2_000_000n,
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
