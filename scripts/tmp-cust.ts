import "dotenv/config";
import { db } from "../src/shared/db";
import { saveCustomer } from "../src/features/customers/service";

(async () => {
  try {
    const created = await saveCustomer(null, { name: "ايمن حميد", phone: "", creditLimit: 0 });
    console.log("CREATED", JSON.stringify(created));
  } catch (e) {
    console.error("ERR", (e as Error).name, (e as Error).message);
  }
  await db.$disconnect();
})();