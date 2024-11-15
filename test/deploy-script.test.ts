import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext, makeLucidContext } from "./service/lucidContext.js";
import { deployMultipleValidators } from "./deployRefScriptsTest.js";

test<LucidContext>("Test 10 - Deploy Script", async () => {
    const program = Effect.gen(function* ($) {
        const context = yield* makeLucidContext();
        const result = yield* deployMultipleValidators(context, [
            "spendService",
            "spendAccount",
            "spendPayment",
        ]);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result).toBeDefined();
});
