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

export const ValueSchema = Data.Map(
    Data.Bytes(),
    Data.Map(Data.Bytes(), Data.Integer()),
);
export type Value = Data.Static<typeof ValueSchema>;
export const Value = ValueSchema as unknown as Value;

// Mint Redeemers
export const CreateMintSchema = Data.Object({
    input_index: Data.Integer(),
    output_index: Data.Integer(),
});

export const DeleteMintSchema = Data.Object({
    reference_token_name: Data.Bytes(),
});

// Account
export const AccountDatumSchema = Data.Object({
    email_hash: Data.Bytes(),
    phone_hash: Data.Bytes(),
});

export type AccountDatum = Data.Static<typeof AccountDatumSchema>;
export const AccountDatum = AccountDatumSchema as unknown as AccountDatum;

export type CreateAccountRedeemer = Data.Static<typeof CreateMintSchema>;
export const CreateAccountRedeemer =
    CreateMintSchema as unknown as CreateAccountRedeemer;

// Service
export const ServiceDatumSchema = Data.Object({
    service_fee_policyid: Data.Bytes(),
    service_fee_assetname: Data.Bytes(),
    service_fee: Data.Integer(),
    penalty_fee_policyid: Data.Bytes(),
    penalty_fee_assetname: Data.Bytes(),
    penalty_fee: Data.Integer(),
    interval_length: Data.Integer(),
    num_intervals: Data.Integer(),
    is_active: Data.Boolean(),
});

export type ServiceDatum = Data.Static<typeof ServiceDatumSchema>;
export const ServiceDatum = ServiceDatumSchema as unknown as ServiceDatum;

export type CreateServiceRedeemer = Data.Static<typeof CreateMintSchema>;
export const CreateServiceRedeemer =
    CreateMintSchema as unknown as CreateServiceRedeemer;

// Payment

export const InstallmentSchema = Data.Object({
    claimable_at: Data.Integer(),
    claimable_amount: Data.Integer(),
});

export type Installment = Data.Static<typeof InstallmentSchema>;
export const Installment = InstallmentSchema as unknown as PaymentDatum;

export const PaymentDatumSchema = Data.Object({
    service_nft_tn: Data.Bytes(),
    subscriber_nft_tn: Data.Bytes(),
    subscription_start: Data.Integer(),
    subscription_end: Data.Integer(),
    original_subscription_end: Data.Integer(),
    installments: Data.Array(InstallmentSchema),
});

export type PaymentDatum = Data.Static<typeof PaymentDatumSchema>;
export const PaymentDatum = PaymentDatumSchema as unknown as PaymentDatum;

export const PenaltyDatumSchema = Data.Object({
    service_nft_tn: Data.Bytes(),
    subscriber_nft_tn: Data.Bytes(),
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

export const SubscribeMintSchema = Data.Object({
    service_ref_input_index: Data.Integer(),
    subscriber_input_index: Data.Integer(),
    payment_output_index: Data.Integer(),
});

export type InitSubscription = Data.Static<typeof SubscribeMintSchema>;
export const InitSubscription =
    SubscribeMintSchema as unknown as InitSubscription;
