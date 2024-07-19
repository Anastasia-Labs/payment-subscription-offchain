import { Lucid, Maestro } from "@lucid-evolution/lucid";

const lucidInstance = async () => {
    console.log("Starting lucidInstance function");
    const maestroToken = Deno.env.get("MAESTRO_TOKEN")!;
    const maestro = new Maestro({
        network: "Preprod",
        apiKey: maestroToken,
    });

    console.log("lucidInstance: ", maestroToken);
    const lucidInstance = await Lucid(maestro, "Preprod");
    console.log("Lucid instance created:", lucidInstance);
    return lucidInstance;
};

export { lucidInstance };
