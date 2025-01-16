import { Data } from "@lucid-evolution/lucid";

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
);
export type AssetClassD = Data.Static<typeof AssetClassSchema>;
export const AssetClassD = AssetClassSchema as unknown as AssetClassD;

export const ValueSchema = Data.Map(
    Data.Bytes(),
    Data.Map(Data.Bytes(), Data.Integer()),
);
export type Value = Data.Static<typeof ValueSchema>;
export const Value = ValueSchema as unknown as Value;

// Redeemers
export const CreateMintSchema = Data.Object({
    output_reference: OutputReferenceSchema,
    input_index: Data.Integer(),
});

export type CreateServiceRedeemer = Data.Static<typeof CreateMintSchema>;
export const CreateServiceRedeemer =
    CreateMintSchema as unknown as CreateServiceRedeemer;

export type CreateAccountRedeemer = Data.Static<typeof CreateMintSchema>;
export const CreateAccountRedeemer =
    CreateMintSchema as unknown as CreateAccountRedeemer;

export type CreatePaymentRedeemer = Data.Static<typeof CreateMintSchema>;
export const CreatePaymentRedeemer =
    CreateMintSchema as unknown as CreatePaymentRedeemer;

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

export type InitiatePayment = Data.Static<typeof CreateMintSchema>;
export const InitiatePayment = CreateMintSchema as unknown as InitiatePayment;

export const WithdrawSchema = Data.Object({
    merchant_input_index: Data.Integer(),
    payment_input_index: Data.Integer(),
});

export type MerchantWithdraw = Data.Static<typeof WithdrawSchema>;
export const MerchantWithdraw = WithdrawSchema as unknown as MerchantWithdraw;

export const PaymentDatumSchema = Data.Object({
    service_nft_tn: Data.Bytes(), //AssetName,
    subscriber_nft_tn: Data.Bytes(),
    subscription_fee: AssetClassSchema,
    subscription_fee_qty: Data.Integer(),
    subscription_start: Data.Integer(),
    subscription_end: Data.Integer(),
    interval_length: Data.Integer(),
    interval_amount: Data.Integer(),
    num_intervals: Data.Integer(),
    last_claimed: Data.Integer(),
    penalty_fee: AssetClassSchema,
    penalty_fee_qty: Data.Integer(),
    minimum_ada: Data.Integer(),
});

export type PaymentDatum = Data.Static<typeof PaymentDatumSchema>;
export const PaymentDatum = PaymentDatumSchema as unknown as PaymentDatum;

export const PenaltyDatumSchema = Data.Object({
    service_nft_tn: Data.Bytes(),
    subscriber_nft_tn: Data.Bytes(),
    penalty_fee: AssetClassSchema,
    penalty_fee_qty: Data.Integer(),
});

export type PenaltyDatum = Data.Static<typeof PenaltyDatumSchema>;
export const PenaltyDatum = PenaltyDatumSchema as unknown as PenaltyDatum;

export const PaymentValidatorDatumSchema = Data.Enum([
    Data.Object({ Payment: Data.Tuple([PaymentDatumSchema]) }),
    Data.Object({ Penalty: Data.Tuple([PenaltyDatumSchema]) }),
]);

export type PaymentValidatorDatum = Data.Static<
    typeof PaymentValidatorDatumSchema
>;
export const PaymentValidatorDatum =
    PaymentValidatorDatumSchema as unknown as PaymentValidatorDatum;
