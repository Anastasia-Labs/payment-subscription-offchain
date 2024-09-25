import {
    applyDoubleCborEncoding,
    MintingPolicy,
    SpendingValidator,
} from "@lucid-evolution/lucid";

import blueprint from "./plutus.json" assert { type: "json" };
import { Script } from "@lucid-evolution/lucid";

export type Validators = {
    spendService: SpendingValidator;
    mintService: MintingPolicy;
    spendAccount: SpendingValidator;
    mintAccount: MintingPolicy;
    spendPayment : SpendingValidator;
    mintPayment : MintingPolicy;
};

export function readMultiValidators(): Validators {
    const getValidator = (title: string): Script => {
        const validator = blueprint.validators.find((v) => v.title === title);
        if (!validator) throw new Error(`Validator not found: ${title}`);
        return {
            type: "PlutusV2",
            script: applyDoubleCborEncoding(validator.compiledCode),
        };
    };

    return {
        spendService: getValidator("service_multi_validator.spend_service"),
        mintService: getValidator("service_multi_validator.mint_service"),
        spendAccount: getValidator("account_multi_validator.spend_account"),
        mintAccount: getValidator("account_multi_validator.mint_account"),
        spendPayment: getValidator("payment_multi_validator.spend_payment"),
        mintPayment: getValidator("payment_multi_validator.mint_payment"),
    };
}
