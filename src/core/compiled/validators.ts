import {
    applyDoubleCborEncoding,
    applyParamsToScript,
    MintingPolicy,
    SpendingValidator,
} from "@lucid-evolution/lucid";
import { Script } from "@lucid-evolution/lucid";

export type Validators = {
    spendService: SpendingValidator;
    mintService: MintingPolicy;
    spendAccount: SpendingValidator;
    mintAccount: MintingPolicy;
    spendPayment: SpendingValidator;
    mintPayment: MintingPolicy;
    alwaysFails: SpendingValidator;
};

export function readMultiValidators(
    blueprint: any,
    params: boolean,
    policyIds: string[],
): Validators {
    const getValidator = (title: string): Script => {
        const validator = blueprint.validators.find((v: { title: string }) =>
            v.title === title
        );
        if (!validator) throw new Error(`Validator not found: ${title}`);

        let script = applyDoubleCborEncoding(validator.compiledCode);

        if (params && policyIds) {
            script = applyParamsToScript(script, policyIds);
        }

        return {
            type: "PlutusV3",
            script: script,
        };
    };

    return {
        spendService: getValidator("service_multi_validator.service.spend"),
        mintService: getValidator("service_multi_validator.service.mint"),
        spendAccount: getValidator("account_multi_validator.account.spend"),
        mintAccount: getValidator("account_multi_validator.account.mint"),
        spendPayment: getValidator("payment_multi_validator.payment.spend"),
        mintPayment: getValidator("payment_multi_validator.payment.mint"),
        alwaysFails: getValidator("always_fails_validator.always_fails.else"),
    };
}
