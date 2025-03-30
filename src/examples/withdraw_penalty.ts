import {
    LucidEvolution,
    merchantPenaltyWithdraw,
    WithdrawPenaltyConfig,
} from "../index.js";
import { makeLucidContext } from "./lucid.js";

const runWithdrawPenalty = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    merchant_nft_tn: string,
    subscriber_nft_tn: string
): Promise<Error | void> => {
    const withdrawPenaltyConfig: WithdrawPenaltyConfig = {
        service_nft_tn: serviceNftTn,
        merchant_nft_tn: merchant_nft_tn,
        subscriber_nft_tn: subscriber_nft_tn,
    };

    try {
        const penaltyWithdrawUnsigned = await merchantPenaltyWithdraw(
            lucid,
            withdrawPenaltyConfig,
        );
        const penaltyWithdrawSigned = await penaltyWithdrawUnsigned.sign
            .withWallet()
            .complete();
        const penaltyWithdrawTxHash = await penaltyWithdrawSigned.submit();

        console.log(`Submitting ...`);
        await lucid.awaitTx(penaltyWithdrawTxHash);

        console.log(`Service created successfully: ${penaltyWithdrawTxHash}`);
    } catch (error) {
        console.error("Failed to create service:", error);
    }
};

const lucidContext = await makeLucidContext()
const lucid = lucidContext.lucid
lucid.selectWallet.fromSeed(lucidContext.users.merchant.seedPhrase)
await runWithdrawPenalty(lucid, "000643b0002304f2370d0212543199071d5f783f0bbe716d28292e1b0c02f91e", "000de140002304f2370d0212543199071d5f783f0bbe716d28292e1b0c02f91e", "000de14000394b21456beff60a682287bfad204e9952cf7104d278470c5cf9da")
