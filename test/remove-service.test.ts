import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext } from "./service/lucidContext.js";
import { removeServiceTestCase } from "./removeServiceTestCase.js";
import { setupBase, setupService } from "./setupTest.js";

test<LucidContext>("Test 3 - Remove Service", async () => {
  const program = Effect.gen(function* () {
    const base = yield* setupBase();
    const setupContext = yield* setupService(base);

    const result = yield* removeServiceTestCase(setupContext);
    return result;
  });

  const result = await Effect.runPromise(program);

  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");
});
