import { LucidEvolution, UTxO } from "@lucid-evolution/lucid";
import { ServiceDatum } from "../core/contract.types.js";
import { CreateServiceConfig, UpdateServiceConfig } from "../core/types.js";
import { getMultiValidator, parseSafeDatum } from "../core/index.js";

export const getValidatorDatum = async (
    lucid: LucidEvolution,
    config: CreateServiceConfig 
  ): Promise<ServiceDatum[]> => {
    const validators = getMultiValidator(lucid, config.scripts);
  
    const validatorUtxos: UTxO[] = await lucid.utxosAt(
      validators.spendValAddress
    );
  
    return validatorUtxos.flatMap((utxo) => {
      const result = parseSafeDatum<ServiceDatum>(utxo.datum, ServiceDatum);
  
      if (result.type == "right") {
        return {
            service_fee: result.value.service_fee,
            service_fee_qty: result.value.service_fee_qty,
            penalty_fee: result.value.penalty_fee,
            penalty_fee_qty: result.value.penalty_fee_qty,
            interval_length: result.value.interval_length,
            num_intervals: result.value.num_intervals,
            minimum_ada: result.value.minimum_ada,
            is_active: result.value.is_active
        };
      } else {
        return [];
      }
    });
  };