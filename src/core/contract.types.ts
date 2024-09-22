import { Data } from "@lucid-evolution/lucid";

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
export const AssetClassSchema = Data.Object({
    policyId: Data.Bytes(),
    assetName: Data.Bytes(),
});

export type AssetClass = Data.Static<typeof AssetClassSchema>;
export const AssetClass = AssetClassSchema as unknown as AssetClass;

export const ValueSchema = Data.Map(
    Data.Bytes(),
    Data.Map(Data.Bytes(), Data.Integer()),
);
export type Value = Data.Static<typeof ValueSchema>;
export const Value = ValueSchema as unknown as Value;

/// Redeemers

export const OutputReferenceSchema = Data.Object({
    txHash: Data.Object({ hash: Data.Bytes({ minLength: 32, maxLength: 32 }) }),
    outputIndex: Data.Integer(),
});
export type OutputReference = Data.Static<typeof OutputReferenceSchema>;
export const OutputReference =
    OutputReferenceSchema as unknown as OutputReference;


export const CreateServiceSchema = Data.Object({
    output_reference: OutputReferenceSchema,
    input_index: Data.Integer(),
});

export type CreateServiceRedeemer = Data.Static<typeof CreateServiceSchema>;
export const CreateServiceRedeemer =
    CreateServiceSchema as unknown as CreateServiceRedeemer;

export const SpendServiceSchema = Data.Enum([
    Data.Literal("UpdateService"),
    Data.Literal("RemoveService"),
]);

export type SpendServiceRedeemer = Data.Static<typeof SpendServiceSchema>;
export const SpendServiceRedeemer =
SpendServiceSchema as unknown as SpendServiceRedeemer;

// const deleteService: MintServiceRedeemer = "DeleteService";

// export const UpdateService = () => Data.to(new Constr(0, []));
// export const RemoveService = () => Data.to(new Constr(1, []));

export const ServiceDatumSchema = Data.Object({
    service_fee: AssetClassSchema,
    service_fee_qty: Data.Integer(),
    penalty_fee: AssetClassSchema,
    penalty_fee_qty: Data.Integer(),
    interval_length: Data.Integer(),
    num_intervals: Data.Integer(),
    minimum_ada: Data.Integer(),
    is_active:Data.Boolean()
});

export type ServiceDatum = Data.Static<typeof ServiceDatumSchema>;
export const ServiceDatum = ServiceDatumSchema as unknown as ServiceDatum;
