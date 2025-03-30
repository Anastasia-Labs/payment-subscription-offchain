import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext, makeLucidContext } from "./service/lucidContext.js";
import { createServiceTestCase } from "./createServiceTestCase.js";

test<LucidContext>("Test 1 - Create Service", async () => {
  const program = Effect.gen(function* (_) {
    const context = yield* makeLucidContext();
    const result = yield* createServiceTestCase(context);
    return result;
  });

  const result = await Effect.runPromise(program);
  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");

  expect(result.serviceConfig).toBeDefined();
});
