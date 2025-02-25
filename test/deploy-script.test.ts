import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext, makeLucidContext } from "./service/lucidContext.js";
import { deployRefScriptTest } from "./deployRefScriptsTest.js";

test<LucidContext>("Test 13 - Deploy Script", async () => {
    const program = Effect.gen(function* (_) {
        const context = yield* makeLucidContext();
        const result = yield* deployRefScriptTest(context);
        return result;
    });

    const result = await Effect.runPromise(program);

    expect(result).toBeDefined();
});
