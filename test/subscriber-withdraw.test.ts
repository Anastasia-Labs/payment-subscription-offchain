import { expect, test } from "vitest";

import { Effect } from "effect";

import { LucidContext } from "./service/lucidContext.js";
import { setupTest } from "./setupTest.js";
import { subscriberWithdrawTestCase } from "./subscriberWithdrawTestCase.js";

test<LucidContext>("Test 1 - Subscriber Withdraw", async () => {
    const program = Effect.gen(function* ($) {
        const setupContext = yield* setupTest();
        const result = yield* subscriberWithdrawTestCase(setupContext);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
});
