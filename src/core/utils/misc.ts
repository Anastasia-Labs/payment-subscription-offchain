import {
  LucidEvolution,
  MintingPolicy,
  SpendingValidator,
  validatorToAddress,
} from "@lucid-evolution/lucid";
import { CborHex, MultiValidator } from "../types.js";

export const getMultiValidator = (
  lucid: LucidEvolution,
  scripts: { spending: CborHex; minting: CborHex; staking: CborHex },
): MultiValidator => {
  const mintValidator: MintingPolicy = {
    type: "PlutusV3",
    script: scripts.minting,
  };

  const network = lucid.config().network;
  if (!network) {
    throw Error("Invalid Network option");
  }
  const mintAddress = validatorToAddress(
    network,
    mintValidator,
  );

  const spendValidator: SpendingValidator = {
    type: "PlutusV3",
    script: scripts.spending,
  };
  const spendValidatorAddress = validatorToAddress(
    network,
    spendValidator,
  );

  return {
    spendValidator: spendValidator,
    spendValAddress: spendValidatorAddress,
    mintValidator: mintValidator,
    mintValAddress: mintAddress,
  };
};
