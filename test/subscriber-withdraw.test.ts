import { expect, test } from "vitest";

import { Effect } from "effect";

import { LucidContext } from "./service/lucidContext.js";
import { setupTest } from "./setupTest.js";
import { subscriberWithdrawTestCase } from "./subscriberWithdrawTestCase.js";

test<LucidContext>("Test 12 - Subscriber Withdraw", async () => {
    const program = Effect.gen(function* (_) {
        const setupContext = yield* setupTest();
        const result = yield* subscriberWithdrawTestCase(setupContext);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
});
