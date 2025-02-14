// yourSDK.ts

import { Effect } from "effect";
import { LucidEvolution, TxSignBuilder } from "@lucid-evolution/lucid";
import {
    CreateAccountConfig,
    CreateServiceConfig,
    ExtendPaymentConfig,
    InitPaymentConfig,
    MerchantWithdrawConfig,
    RemoveAccountConfig,
    RemoveServiceConfig,
    SubscriberWithdrawConfig,
    UnsubscribeConfig,
    UpdateAccountConfig,
    UpdateServiceConfig,
    WithdrawPenaltyConfig,
} from "../core/types.js";
import { createServiceProgram } from "./createService.js";
import { updateServiceProgram } from "./updateService.js";
import { removeServiceProgram } from "./removeService.js";
import { createAccountProgram } from "./createAccount.js";
import { updateAccountProgram } from "./updateAccount.js";
import { removeAccountProgram } from "./removeAccount.js";
import { initSubscriptionProgram } from "./initiateSubscription.js";
import { extendSubscriptionProgram } from "./extendSubscription.js";
import { merchantWithdrawProgram } from "./merchantWithdraw.js";
import { merchantPenaltyWithdrawProgram } from "./merchantPenaltyWithdraw.js";
import { subscriberWithdrawProgram } from "./subscriberWithdraw.js";
import { unsubscribeProgram } from "./unsubscribe.js";

export async function createService(
    lucid: LucidEvolution,
    config: CreateServiceConfig,
): Promise<TxSignBuilder> {
    return Effect.runPromise(
        createServiceProgram(lucid, config),
    );
}

export async function updateService(
    lucid: LucidEvolution,
    config: UpdateServiceConfig,
): Promise<TxSignBuilder> {
    return Effect.runPromise(
        updateServiceProgram(lucid, config),
    );
}

export async function removeService(
    lucid: LucidEvolution,
    config: RemoveServiceConfig,
): Promise<TxSignBuilder> {
    return Effect.runPromise(
        removeServiceProgram(lucid, config),
    );
}

export async function createAccount(
    lucid: LucidEvolution,
    config: CreateAccountConfig,
): Promise<TxSignBuilder> {
    return Effect.runPromise(
        createAccountProgram(lucid, config),
    );
}

export async function updateAccount(
    lucid: LucidEvolution,
    config: UpdateAccountConfig,
): Promise<TxSignBuilder> {
    return Effect.runPromise(
        updateAccountProgram(lucid, config),
    );
}

export async function removeAccount(
    lucid: LucidEvolution,
    config: RemoveAccountConfig,
): Promise<TxSignBuilder> {
    return Effect.runPromise(
        removeAccountProgram(lucid, config),
    );
}

export async function initiateSubscription(
    lucid: LucidEvolution,
    config: InitPaymentConfig,
): Promise<TxSignBuilder> {
    return Effect.runPromise(
        initSubscriptionProgram(lucid, config),
    );
}

export async function extendSubscription(
    lucid: LucidEvolution,
    config: ExtendPaymentConfig,
): Promise<TxSignBuilder> {
    return Effect.runPromise(
        extendSubscriptionProgram(lucid, config),
    );
}

export async function merchantWithdraw(
    lucid: LucidEvolution,
    config: MerchantWithdrawConfig,
): Promise<TxSignBuilder> {
    return Effect.runPromise(
        merchantWithdrawProgram(lucid, config),
    );
}
export async function unsubscribe(
    lucid: LucidEvolution,
    config: UnsubscribeConfig,
): Promise<TxSignBuilder> {
    return Effect.runPromise(
        unsubscribeProgram(lucid, config),
    );
}
export async function merchantPenaltyWithdraw(
    lucid: LucidEvolution,
    config: WithdrawPenaltyConfig,
): Promise<TxSignBuilder> {
    return Effect.runPromise(
        merchantPenaltyWithdrawProgram(lucid, config),
    );
}

export async function subscriberWithdraw(
    lucid: LucidEvolution,
    config: SubscriberWithdrawConfig,
): Promise<TxSignBuilder> {
    return Effect.runPromise(
        subscriberWithdrawProgram(lucid, config),
    );
}
