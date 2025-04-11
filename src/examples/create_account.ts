import {
    createAccount,
    CreateAccountConfig,
    LucidEvolution,
} from "../index.js";
import { makeLucidContext } from "./lucid.js";

const runCreateAccount = async (
    lucid: LucidEvolution,
): Promise<Error | void> => {
    try {
        const utxos = await lucid.wallet().getUtxos()
        const accountConfig: CreateAccountConfig = {
            selected_out_ref: utxos[0],
            email: "business@web3.ada",
            phone: "288-481-2686",
        };

        const createAccountUnsigned = await createAccount(lucid, accountConfig);
        const createAccountSigned = await createAccountUnsigned.sign
            .withWallet()
            .complete();
        const createAccountHash = await createAccountSigned.submit();
        console.log(`Submitting ...`);
        await lucid.awaitTx(createAccountHash);

        console.log(`Account created successfully: ${createAccountHash}`);
    } catch (error) {
        console.error("Failed to create Account:", error);
    }
};

const lucidContext = await makeLucidContext()
const lucid = lucidContext.lucid
lucid.selectWallet.fromSeed(lucidContext.users.subscriber.seedPhrase)
await runCreateAccount(lucid)
