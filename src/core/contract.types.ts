import { Constr, Data, OutRef } from "@lucid-evolution/lucid";
import { boolean } from "effect/Equivalence";

export const OutputReferenceSchema = Data.Object({
    txHash: Data.Object({ hash: Data.Bytes({ minLength: 32, maxLength: 32 }) }),
    outputIndex: Data.Integer(),
});
export type OutputReference = Data.Static<typeof OutputReferenceSchema>;
export const OutputReference =
    OutputReferenceSchema as unknown as OutputReference;

export const CredentialSchema = Data.Enum([
    Data.Object({
        PublicKeyCredential: Data.Tuple([
            Data.Bytes({ minLength: 28, maxLength: 28 }),
        ]),
    }),
    Data.Object({
        ScriptCredential: Data.Tuple([
            Data.Bytes({ minLength: 28, maxLength: 28 }),
        ]),
    }),
]);
export type CredentialD = Data.Static<typeof CredentialSchema>;
export const CredentialD = CredentialSchema as unknown as CredentialD;

export const AddressSchema = Data.Object({
    paymentCredential: CredentialSchema,
    stakeCredential: Data.Nullable(
        Data.Enum([
            Data.Object({ Inline: Data.Tuple([CredentialSchema]) }),
            Data.Object({
                Pointer: Data.Tuple([
                    Data.Object({
                        slotNumber: Data.Integer(),
                        transactionIndex: Data.Integer(),
                        certificateIndex: Data.Integer(),
                    }),
                ]),
            }),
        ]),
    ),
});

export type AddressD = Data.Static<typeof AddressSchema>;
export const AddressD = AddressSchema as unknown as AddressD;

//NOTE: liqwid-plutarch-extra AssetClass version, not PlutusLedgerApi.V1.Value
export const AssetClassSchema = Data.Object(
    {
        policyId: Data.Bytes(),
        assetName: Data.Bytes(),
    },
    // { hasConstr: false },
);
export type AssetClassD = Data.Static<typeof AssetClassSchema>;
export const AssetClassD = AssetClassSchema as unknown as AssetClassD;

// List [B "test",B "tn"]

export const ValueSchema = Data.Map(
    Data.Bytes(),
    Data.Map(Data.Bytes(), Data.Integer()),
);
export type Value = Data.Static<typeof ValueSchema>;
export const Value = ValueSchema as unknown as Value;

/// Redeemers
export const CreateMintSchema = Data.Object({
    output_reference: OutputReferenceSchema,
    input_index: Data.Integer(),
});

export type CreateServiceRedeemer = Data.Static<typeof CreateMintSchema>;
export const CreateServiceRedeemer =
    CreateMintSchema as unknown as CreateServiceRedeemer;

// export const MintServiceSchema = Data.Enum([
//     Data.Literal("UpdateService"),
//     Data.Literal("RemoveService"),
// ]);

// export type MintServiceRedeemer = Data.Static<typeof MintServiceSchema>;
// export const MintServiceRedeemer =
//     MintServiceSchema as unknown as MintServiceRedeemer;

export type CreateAccountRedeemer = Data.Static<typeof CreateMintSchema>;
export const CreateAccountRedeemer =
    CreateMintSchema as unknown as CreateAccountRedeemer;

// const deleteService: MintServiceRedeemer = "DeleteService";

// export const UpdateService = () => Data.to(new Constr(0, []));
// export const RemoveService = () => Data.to(new Constr(1, []));

// pub type ServiceDatum {
//     service_fee: AssetClass,
//     service_fee_qty: Int,
//     // non-negative
//     penalty_fee: AssetClass,
//     penalty_fee_qty: Int,
//     interval_length: Int,
//     num_intervals: Int,
//     minimum_ada: Int,
//     is_active: Bool,
//   }

export const ServiceDatumSchema = Data.Object({
    service_fee: AssetClassSchema,
    service_fee_qty: Data.Integer(),
    penalty_fee: AssetClassSchema,
    penalty_fee_qty: Data.Integer(),
    interval_length: Data.Integer(),
    num_intervals: Data.Integer(),
    minimum_ada: Data.Integer(),
    is_active: Data.Boolean(),
});

export type ServiceDatum = Data.Static<typeof ServiceDatumSchema>;
export const ServiceDatum = ServiceDatumSchema as unknown as ServiceDatum;

export const AccountDatumSchema = Data.Object({
    email: Data.Bytes(),
    phone: Data.Bytes(),
    account_created: Data.Integer(),
});

export type AccountDatum = Data.Static<typeof AccountDatumSchema>;
export const AccountDatum = AccountDatumSchema as unknown as AccountDatum;
