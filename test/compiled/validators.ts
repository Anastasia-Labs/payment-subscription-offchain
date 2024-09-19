import { applyDoubleCborEncoding, MintingPolicy, SpendingValidator } from "@lucid-evolution/lucid";

import blueprint from "./plutus.json" assert { type: "json" };

export type Validators = {
    spendService: SpendingValidator;
    mintService: MintingPolicy;
};

export function readServiceMultiValidator(): Validators {
    const spendService = blueprint.validators.find((v) =>
        v.title === "service_multi_validator.spend_service"
    );

    if (!spendService) {
        throw new Error("spendService validator not found");
    }

    const mintService = blueprint.validators.find(
        (v) => v.title === "service_multi_validator.mint_service",
    );

    if (!mintService) {
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
    };
}
