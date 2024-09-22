import {
    applyDoubleCborEncoding,
    MintingPolicy,
    SpendingValidator,
} from "@lucid-evolution/lucid";

import blueprint from "./plutus.json" assert { type: "json" };

export type Validators = {
    spendService: SpendingValidator;
    mintService: MintingPolicy;
    spendAccount: SpendingValidator;
    mintAccount: MintingPolicy;
};

export function readMultiValidators(): Validators {
    const spendService = blueprint.validators.find((v) =>
        v.title === "service_multi_validator.spend_service"
    );

    if (!spendService) {
        throw new Error("spendService validator not found");
    }

    const mintService = blueprint.validators.find((v) =>
        v.title === "service_multi_validator.mint_service"
    );

    if (!mintService) {
        throw new Error("Mint NFT validator not found");
    }

    const spendAccount = blueprint.validators.find((v) =>
        v.title === "account_multi_validator.spend_account"
    );

    if (!spendAccount) {
        throw new Error("spendAccount validator not found");
    }

    const mintAccount = blueprint.validators.find((v) =>
        v.title === "account_multi_validator.mint_account"
    );

    if (!mintAccount) {
        throw new Error("Mint NFT validator not found");
    }

    return {
        spendService: {
            type: "PlutusV2",
            script: applyDoubleCborEncoding(spendService.compiledCode),
        },
        mintService: {
            type: "PlutusV2",
            script: applyDoubleCborEncoding(mintService.compiledCode),
        },
        spendAccount: {
            type: "PlutusV2",
            script: applyDoubleCborEncoding(spendAccount.compiledCode),
        },
        mintAccount: {
            type: "PlutusV2",
            script: applyDoubleCborEncoding(mintAccount.compiledCode),
        },
    };
}
