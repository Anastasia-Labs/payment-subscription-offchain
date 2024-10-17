import { expect, test } from "vitest";
import { Effect } from "effect";
import { LucidContext, makeLucidContext } from "./emulator/service.js";
import { createAccountTestCase } from "./createAccountTestCase.js";

test<LucidContext>("Test 1 - Create Account", async () => {
  const program = Effect.gen(function* ($) {
    const context = yield* makeLucidContext("Preprod");
    const result = yield* createAccountTestCase(context);
    console.log("Je hapa?: ");
    return result;
  });

  const result = await Effect.runPromise(program);

  expect(result.txHash).toBeDefined();
  expect(typeof result.txHash).toBe("string");
  expect(result.accountConfig).toBeDefined();
  expect(result.outputs).toBeDefined();
});
