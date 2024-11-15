import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext, makeLucidContext } from "./service/lucidContext.js";
import { unsubscribeTestCase } from "./unsubscribeTestCase.js";
import { setupTest } from "./setupTest.js";

test<LucidContext>("Test 1 - Unsubscribe", async () => {
    const program = Effect.gen(function* ($) {
        const setupContext = yield* setupTest();

        const result = yield* unsubscribeTestCase(setupContext);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
});
