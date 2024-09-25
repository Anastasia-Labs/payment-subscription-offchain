import { LucidEvolution, UTxO } from "@lucid-evolution/lucid";
import { CreateAccountConfig, CreateServiceConfig, ReadableUTxO,  } from "../core/types.js";
import { parseSafeDatum } from "../core/utils/utils.js";
import { getMultiValidator } from "../core/utils/misc.js";
import { AccountDatum, ServiceDatum } from "../core/contract.types.js";

export const getAccountValidatorUtxos = async (
    lucid: LucidEvolution,
    config: CreateAccountConfig 
  ): Promise<ReadableUTxO<AccountDatum>[]> => {
    const validators = getMultiValidator(lucid, config.scripts);
  
    const validatorUtxos: UTxO[] = await lucid.utxosAt(
      validators.spendValAddress
    );
  
    return validatorUtxos.flatMap((utxo) => {
      const result = parseSafeDatum<AccountDatum>(utxo.datum, AccountDatum);
  
      if (result.type == "right") {
        return {
          outRef: {
            txHash: utxo.txHash,
            outputIndex: utxo.outputIndex,
          },
          datum: result.value,
          assets: utxo.assets,
        };
      } else {
        return [];
      }
    });
  };