import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext, makeLucidContext } from "./service/lucidContext.js";
import { removeServiceTestCase } from "./removeServiceTestCase.js";
import { setupTest } from "./setupTest.js";

test<LucidContext>("Test 3 - Remove Service", async () => {
  const program = Effect.gen(function* () {
    const setupContext = yield* setupTest();

    const result = yield* removeServiceTestCase(setupContext);
    return result;
  });

  const result = await Effect.runPromise(program);

  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");
  expect(result.removeServiceConfig).toBeDefined();
});
