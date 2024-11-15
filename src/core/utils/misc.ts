import {
  applyParamsToScript,
  Constr,
  LucidEvolution,
  MintingPolicy,
  SpendingValidator,
  validatorToAddress,
  validatorToRewardAddress,
} from "@lucid-evolution/lucid";
import { CborHex, MultiValidator } from "../types.js";

export const getMultiValidator = (
  lucid: LucidEvolution,
  scripts: { spending: CborHex; minting: CborHex; staking: CborHex },
): MultiValidator => {
  const mintValidator: MintingPolicy = {
    type: "PlutusV2",
    script: scripts.minting,
  };

  const network = lucid.config().network;
  const mintAddress = validatorToAddress(
    network,
    mintValidator,
  );

  const spendValidator: SpendingValidator = {
    type: "PlutusV2",
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
