import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext, makeLucidContext } from "./service/lucidContext.js";
import { deployRefScriptTest } from "./deployRefScriptsTest.js";

test<LucidContext>("Test 10 - Deploy Script", async () => {
    const program = Effect.gen(function* ($) {
        const context = yield* makeLucidContext();
        const result = yield* deployRefScriptTest(context, "spendService");
        return result;
    });

    const result = await Effect.runPromise(program);

    // Iterate over each result and perform assertions
    expect(result.txHash).toBeDefined();
    expect(typeof result.txHash).toBe("string");
    expect(result.deployConfig).toBeDefined();
    expect(typeof result.deployConfig.tknName).toBe("string");
});
