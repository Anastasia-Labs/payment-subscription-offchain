import { mintingPolicyToId } from "@lucid-evolution/lucid";
import { readMultiValidators } from "../compiled/validators";
import blueprint from "../compiled/plutus.json" assert { type: "json" };

const serviceValidator = readMultiValidators(blueprint, false, []);
const servicePolicyId = mintingPolicyToId(serviceValidator.mintService);

const serviceScript = {
    spending: serviceValidator.spendService.script,
    minting: serviceValidator.mintService.script,
    staking: "",
};

const accountValidator = readMultiValidators(blueprint, false, []);
const accountPolicyId = mintingPolicyToId(accountValidator.mintAccount);

const accountScript = {
    spending: accountValidator.spendAccount.script,
    minting: accountValidator.mintAccount.script,
    staking: "",
};

const paymentValidator = readMultiValidators(blueprint, true, [
    servicePolicyId,
    accountPolicyId,
]);

const paymentPolicyId = mintingPolicyToId(
    paymentValidator.mintPayment,
);

const paymentScript = {
    spending: paymentValidator.spendPayment.script,
    minting: paymentValidator.mintPayment.script,
    staking: "",
};

export {
    accountPolicyId,
    accountScript,
    accountValidator,
    paymentPolicyId,
    paymentScript,
    paymentValidator,
    servicePolicyId,
    serviceScript,
    serviceValidator,
};
