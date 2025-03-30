import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext } from "./service/lucidContext.js";
import { unsubscribeTestCase } from "./unsubscribeTestCase.js";
import { setupTest } from "./setupTest.js";

test<LucidContext>("Test 10 - Unsubscribe", async () => {
    const program = Effect.gen(function* (_) {
        const setupContext = yield* setupTest();

        const result = yield* unsubscribeTestCase(setupContext);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
});
