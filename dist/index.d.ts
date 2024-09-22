import * as _lucid_evolution_lucid from '@lucid-evolution/lucid';
import { Data, Address, Script, OutRef, Assets, UTxO, LucidEvolution, TxSignBuilder, TransactionError, Network } from '@lucid-evolution/lucid';
export * from '@lucid-evolution/lucid';
import { Effect } from 'effect';

declare const OutputReferenceSchema: _lucid_evolution_lucid.TObject<{
    txHash: _lucid_evolution_lucid.TObject<{
        hash: _lucid_evolution_lucid.TUnsafe<string>;
    }>;
    outputIndex: _lucid_evolution_lucid.TUnsafe<bigint>;
}>;
type OutputReference = Data.Static<typeof OutputReferenceSchema>;
declare const OutputReference: OutputReference;
declare const CredentialSchema: _lucid_evolution_lucid.TUnion<(_lucid_evolution_lucid.TObject<{
    PublicKeyCredential: _lucid_evolution_lucid.TTuple<[_lucid_evolution_lucid.TUnsafe<string>]>;
}> | _lucid_evolution_lucid.TObject<{
    ScriptCredential: _lucid_evolution_lucid.TTuple<[_lucid_evolution_lucid.TUnsafe<string>]>;
}>)[]>;
type CredentialD = Data.Static<typeof CredentialSchema>;
declare const CredentialD: CredentialD;
declare const AddressSchema: _lucid_evolution_lucid.TObject<{
    paymentCredential: _lucid_evolution_lucid.TUnion<(_lucid_evolution_lucid.TObject<{
        PublicKeyCredential: _lucid_evolution_lucid.TTuple<[_lucid_evolution_lucid.TUnsafe<string>]>;
    }> | _lucid_evolution_lucid.TObject<{
        ScriptCredential: _lucid_evolution_lucid.TTuple<[_lucid_evolution_lucid.TUnsafe<string>]>;
    }>)[]>;
    stakeCredential: _lucid_evolution_lucid.TUnsafe<{
        Inline: [{
            PublicKeyCredential: [string];
        } | {
            ScriptCredential: [string];
        }];
    } | {
        Pointer: [{
            slotNumber: bigint;
            transactionIndex: bigint;
            certificateIndex: bigint;
        }];
    } | null>;
}>;
type AddressD = Data.Static<typeof AddressSchema>;
declare const AddressD: AddressD;
declare const AssetClassSchema: _lucid_evolution_lucid.TObject<{
    policyId: _lucid_evolution_lucid.TUnsafe<string>;
    assetName: _lucid_evolution_lucid.TUnsafe<string>;
}>;
type AssetClass = Data.Static<typeof AssetClassSchema>;
declare const AssetClass: AssetClass;
declare const ValueSchema: _lucid_evolution_lucid.TUnsafe<Map<string, Map<string, bigint>>>;
type Value = Data.Static<typeof ValueSchema>;
declare const Value: Value;
declare const CreateServiceSchema: _lucid_evolution_lucid.TObject<{
    output_reference: _lucid_evolution_lucid.TObject<{
        txHash: _lucid_evolution_lucid.TObject<{
            hash: _lucid_evolution_lucid.TUnsafe<string>;
        }>;
        outputIndex: _lucid_evolution_lucid.TUnsafe<bigint>;
    }>;
    input_index: _lucid_evolution_lucid.TUnsafe<bigint>;
}>;
type CreateServiceRedeemer = Data.Static<typeof CreateServiceSchema>;
declare const CreateServiceRedeemer: CreateServiceRedeemer;
declare const MintAccountSchema: _lucid_evolution_lucid.TUnion<(_lucid_evolution_lucid.TLiteral<"UpdateService"> | _lucid_evolution_lucid.TLiteral<"RemoveService">)[]>;
type MintServiceRedeemer = Data.Static<typeof MintAccountSchema>;
declare const MintServiceRedeemer: MintServiceRedeemer;
declare const ServiceDatumSchema: _lucid_evolution_lucid.TObject<{
    service_fee: _lucid_evolution_lucid.TObject<{
        policyId: _lucid_evolution_lucid.TUnsafe<string>;
        assetName: _lucid_evolution_lucid.TUnsafe<string>;
    }>;
    service_fee_qty: _lucid_evolution_lucid.TUnsafe<bigint>;
    penalty_fee: _lucid_evolution_lucid.TObject<{
        policyId: _lucid_evolution_lucid.TUnsafe<string>;
        assetName: _lucid_evolution_lucid.TUnsafe<string>;
    }>;
    penalty_fee_qty: _lucid_evolution_lucid.TUnsafe<bigint>;
    interval_length: _lucid_evolution_lucid.TUnsafe<bigint>;
    num_intervals: _lucid_evolution_lucid.TUnsafe<bigint>;
    minimum_ada: _lucid_evolution_lucid.TUnsafe<bigint>;
    is_active: _lucid_evolution_lucid.TUnsafe<boolean>;
}>;
type ServiceDatum = Data.Static<typeof ServiceDatumSchema>;
declare const ServiceDatum: ServiceDatum;

type CborHex = string;
type RawHex = string;
type POSIXTime = number;
type Result<T> = {
    type: "ok";
    data: T;
} | {
    type: "error";
    error: Error;
};
type Either<L, R> = {
    type: "left";
    value: L;
} | {
    type: "right";
    value: R;
};
type CreateServiceConfig = {
    service_fee: AssetClass;
    service_fee_qty: bigint;
    penalty_fee: AssetClass;
    penalty_fee_qty: bigint;
    interval_length: bigint;
    num_intervals: bigint;
    minimum_ada: bigint;
    is_active: boolean;
    scripts: {
        spending: CborHex;
        minting: CborHex;
        staking: CborHex;
    };
};
type UpdateServiceConfig = {
    new_service_fee: AssetClass;
    new_service_fee_qty: bigint;
    new_penalty_fee: AssetClass;
    new_penalty_fee_qty: bigint;
    new_interval_length: bigint;
    new_num_intervals: bigint;
    new_minimum_ada: bigint;
    is_active: boolean;
    scripts: {
        spending: CborHex;
        minting: CborHex;
        staking: CborHex;
    };
    merchantAddr: Address;
};
type MakeServiceConfig = {
    service_fee: AssetClass;
    service_fee_qty: BigInt;
    penalty_fee: AssetClass;
    penalty_fee_qty: BigInt;
    interval_length: BigInt;
    num_intervals: BigInt;
    minimum_ada: BigInt;
    is_active: boolean;
    scripts: {
        minting: CborHex;
    };
};
type ServiceMultiValidator = {
    spendServiceValidator: Script;
    spendServiceValAddress: Address;
    mintServiceValidator: Script;
    mintServiceValAddress: Address;
};
type CancelOfferConfig = {
    offerOutRef: OutRef;
    scripts: {
        spending: CborHex;
        staking: CborHex;
    };
};
type AcceptOfferConfig = {
    offerOutRef: OutRef;
    scripts: {
        spending: CborHex;
        staking: CborHex;
    };
};
type OfferValidators = {
    directOfferVal: Script;
    directOfferValAddress: Address;
    stakingVal: Script;
    rewardAddress: Address;
};
type ReadableUTxO<T> = {
    outRef: OutRef;
    datum: T;
    assets: Assets;
};
type OfferInfo = {
    creator: Address;
    toBuy: Value;
    offer: Value;
    offerUTxO: UTxO;
};

declare const createService: (lucid: LucidEvolution, config: CreateServiceConfig) => Promise<Result<TxSignBuilder>>;
declare const createServiceEffect: (lucid: LucidEvolution, config: CreateServiceConfig) => Promise<Effect.Effect<TxSignBuilder, TransactionError, never>>;

declare const updateService: (lucid: LucidEvolution, config: UpdateServiceConfig) => Promise<Result<TxSignBuilder>>;

declare const sendTokenToService: (lucid: LucidEvolution, config: CreateServiceConfig) => Promise<Result<TxSignBuilder>>;

declare const ONE_HOUR_MS = 3600000;
declare const ONE_YEAR_MS = 31557600000;
declare const TWO_YEARS_MS: number;
declare const TWENTY_FOUR_HOURS_MS: number;
declare const PROTOCOL_FEE = 0.05;
declare const TIME_TOLERANCE_MS: number;
declare const PROTOCOL_PAYMENT_KEY = "014e9d57e1623f7eeef5d0a8d4e6734a562ba32cf910244cd74e1680";
declare const PROTOCOL_STAKE_KEY = "5e8aa3f089868eaadf188426f49db6566624844b6c5d529b38f3b8a7";

declare const getServiceMultiValidator: (lucid: LucidEvolution, scripts: {
    spending: CborHex;
    minting: CborHex;
    staking: CborHex;
}) => ServiceMultiValidator;

declare function ok<T>(x: T): Result<T>;
declare const utxosAtScript: (lucid: LucidEvolution, script: string, stakeCredentialHash?: string) => Promise<UTxO[]>;
declare const parseSafeDatum: <T>(datum: string | null | undefined, datumType: T) => Either<string, T>;
declare const parseUTxOsAtScript: <T>(lucid: LucidEvolution, script: string, datumType: T, stakeCredentialHash?: string) => Promise<ReadableUTxO<T>[]>;
declare const toCBORHex: (rawHex: string) => string;
declare const generateAccountSeedPhrase: (assets: Assets) => Promise<{
    seedPhrase: string;
    address: () => Promise<Address>;
    assets: Assets;
}>;
declare function fromAddress(address: Address): AddressD;
declare function toAddress(address: AddressD, network: Network): Address;
declare const fromAddressToData: (address: Address) => Result<Data>;
declare const chunkArray: <T>(array: T[], chunkSize: number) => T[][];
declare const replacer: (_key: unknown, value: unknown) => unknown;
declare const divCeil: (a: bigint, b: bigint) => bigint;
declare function union(a1: Assets, a2: Assets): Assets;
declare function fromAssets(assets: Assets): Value;
declare function toAssets(value: Value): Assets;
/**
 * Returns a list of UTxOs whose total assets are equal to or greater than the asset value provided
 * @param utxos list of available utxos
 * @param minAssets minimum total assets required
 */
declare function selectUtxos(utxos: UTxO[], minAssets: Assets): Result<UTxO[]>;
declare function getInputUtxoIndices(indexInputs: UTxO[], remainingInputs: UTxO[]): bigint[];
declare function sortByOutRefWithIndex(utxos: UTxO[]): UTxO[];
declare function sumUtxoAssets(utxos: UTxO[]): Assets;
/** Remove the intersection of a & b asset quantities from a
 * @param a assets to be removed from
 * @param b assets to remove
 * For e.g.
 * a = {[x] : 5n, [y] : 10n}
 * b = {[x] : 3n, [y] : 15n, [z] : 4n}
 * remove(a, b) = {[x] : 2n}
 */
declare function remove(a: Assets, b: Assets): Assets;

export { AcceptOfferConfig, AddressD, AddressSchema, AssetClass, AssetClassSchema, CancelOfferConfig, CborHex, CreateServiceConfig, CreateServiceRedeemer, CreateServiceSchema, CredentialD, CredentialSchema, Either, MakeServiceConfig, MintAccountSchema, MintServiceRedeemer, ONE_HOUR_MS, ONE_YEAR_MS, OfferInfo, OfferValidators, OutputReference, OutputReferenceSchema, POSIXTime, PROTOCOL_FEE, PROTOCOL_PAYMENT_KEY, PROTOCOL_STAKE_KEY, RawHex, ReadableUTxO, Result, ServiceDatum, ServiceDatumSchema, ServiceMultiValidator, TIME_TOLERANCE_MS, TWENTY_FOUR_HOURS_MS, TWO_YEARS_MS, UpdateServiceConfig, Value, ValueSchema, chunkArray, createService, createServiceEffect, divCeil, fromAddress, fromAddressToData, fromAssets, generateAccountSeedPhrase, getInputUtxoIndices, getServiceMultiValidator, ok, parseSafeDatum, parseUTxOsAtScript, remove, replacer, selectUtxos, sendTokenToService, sortByOutRefWithIndex, sumUtxoAssets, toAddress, toAssets, toCBORHex, union, updateService, utxosAtScript };
