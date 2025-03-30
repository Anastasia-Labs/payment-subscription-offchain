import {
    LucidEvolution,
    removeService,
    RemoveServiceConfig,
} from "../index.js";
import { makeLucidContext } from "./lucid.js";

const runRemoveService = async (
    lucid: LucidEvolution,
    serviceNftTn: string,
    merchantNftTn: string,
): Promise<Error | void> => {
    const removeServiceConfig: RemoveServiceConfig = {
        service_nft_tn: serviceNftTn,
        merchant_nft_tn: merchantNftTn,
    };

    try {
        const removeServiceUnsigned = await removeService(
            lucid,
            removeServiceConfig,
        );
        const removeServiceSigned = await removeServiceUnsigned.sign
            .withWallet()
            .complete();
        const removeServiceHash = await removeServiceSigned.submit();

        console.log(`Submitting ...`);
        await lucid.awaitTx(removeServiceHash);

        console.log(
            `Service removed successfully || change isActive to false: ${removeServiceHash}`,
        );
    } catch (error) {
        console.error("Failed to remove Service:", error);
    }
};

const lucidContext = await makeLucidContext()
const lucid = lucidContext.lucid
lucid.selectWallet.fromSeed(lucidContext.users.merchant.seedPhrase)
await runRemoveService(lucid, "000643b0002304f2370d0212543199071d5f783f0bbe716d28292e1b0c02f91e", "000de140002304f2370d0212543199071d5f783f0bbe716d28292e1b0c02f91e")
