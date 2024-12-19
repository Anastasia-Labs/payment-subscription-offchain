import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext, makeLucidContext } from "./service/lucidContext.js";
import { createAccountTestCase } from "./createAccountTestCase.js";

test<LucidContext>("Test 4 - Create Account", async () => {
  const program = Effect.gen(function* ($) {
    const context = yield* makeLucidContext();
    const result = yield* createAccountTestCase(context);
    return result;
  });

  const result = await Effect.runPromise(program);

  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");
  expect(result.accountConfig).toBeDefined();
});
