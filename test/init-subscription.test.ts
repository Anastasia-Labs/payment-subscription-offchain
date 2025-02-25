import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext } from "./service/lucidContext.js";
import { initSubscriptionTestCase } from "./initSubscriptionTestCase.js";
import { setupTest } from "./setupTest.js";

test<LucidContext>("Test 7 - Initiate subscription", async () => {
  const program = Effect.gen(function* (_) {
    const setupContext = yield* setupTest();
    const result = yield* initSubscriptionTestCase(setupContext);
    return result;
  });

  const result = await Effect.runPromise(program);
  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");

  expect(result.paymentConfig).toBeDefined();
  expect(result.setupResult).toBeDefined();
});
