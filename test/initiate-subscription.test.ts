import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext, makeLucidContext } from "./service/lucidContext.js";
import { initiateSubscriptionTestCase } from "./initiateSubscriptionTestCase.js";
import { setupTest } from "./setupTest.js";

test<LucidContext>("Test 1 - Initiate subscription", async () => {
  const program = Effect.gen(function* ($) {
    const setupContext = yield* setupTest();
    const result = yield* initiateSubscriptionTestCase(setupContext);
    return result;
  });

  const result = await Effect.runPromise(program);
  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");

  expect(result.paymentConfig).toBeDefined();
  expect(result.outputs).toBeDefined();
});
