import {
  createAccount,
  CreateAccountConfig,
  mintingPolicyToId,
  toUnit,
  Unit,
  UTxO,
  validatorToAddress,
} from "../src/index.js";
import { expect, test } from "vitest";
import { readMultiValidators } from "./compiled/validators.js";
import { Effect } from "effect";
import blueprint from "./compiled/plutus.json" assert { type: "json" };
import { LucidContext, makeLucidContext } from "./emulator/service.js";
import { findCip68TokenNames } from "../src/core/utils/assets.js";
import { createAccountTestCase } from "./createAccountTestCase.js";

test<LucidContext>("Test 1 - Create Account", async () => {
  const program = Effect.gen(function* ($) {
    // const context = yield* makeEmulatorContext;
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
