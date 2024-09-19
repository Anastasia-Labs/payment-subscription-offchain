import {
  applyParamsToScript,
  Constr,
  LucidEvolution,
  MintingPolicy,
  SpendingValidator,
  validatorToAddress,
  validatorToRewardAddress,
} from "@lucid-evolution/lucid";
import { CborHex, ServiceMultiValidator } from "../types.js";

export const getServiceMultiValidator = (
  lucid: LucidEvolution,
  scripts: { spending: CborHex; minting: CborHex; staking: CborHex },
): ServiceMultiValidator => {
  const mintServiceValidator: MintingPolicy = {
    type: "PlutusV2",
    script: scripts.minting,
  };

  const network = lucid.config().network;
  const mintServiceAddress = validatorToAddress(
    network,
    mintServiceValidator,
  );

  const spendServiceValidator: SpendingValidator = {
    type: "PlutusV2",
    script: scripts.spending,
  };
  const spendServiceValidatorAddress = validatorToAddress(
    network,
    spendServiceValidator,
  );

  return {
    spendServiceValidator: spendServiceValidator,
    spendServiceValAddress: spendServiceValidatorAddress,
    mintServiceValidator: mintServiceValidator,
    mintServiceValAddress: mintServiceAddress,
  };
};
