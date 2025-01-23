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

// Add a cache at module level
let cachedValidators: Validators | null = null;

export function readMultiValidators(
    blueprint: any,
    params: boolean,
    policyIds: string[],
): Validators {
    // Return cached validators if they exist
    if (cachedValidators) {
        return cachedValidators;
    }

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
            type: "PlutusV2",
            script: script,
        };
    };

    // Create validators only once
    cachedValidators = {
        spendService: getValidator("service_multi_validator.spend_service"),
        mintService: getValidator("service_multi_validator.mint_service"),
        spendAccount: getValidator("account_multi_validator.spend_account"),
        mintAccount: getValidator("account_multi_validator.mint_account"),
        spendPayment: getValidator("payment_multi_validator.spend_payment"),
        mintPayment: getValidator("payment_multi_validator.mint_payment"),
        alwaysFails: getValidator("always_fails_validator.always_fails"),
    };

    return cachedValidators;
}
