import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appMeta, medicines, pharmacies, stocks, type StockStatus } from "@/db/schema";
import { ensureSeedAccounts } from "@/db/auth-seed";

const demoPharmacies = [
  { name: "MedFinder Demo · Bole 01", area: "Bole", address: "Airport Road, near Bole Medhanialem", licenseNumber: "DEMO-AA-001", verified: true, phone: "+251 91 000 1001", latitude: 8.9975, longitude: 38.7878, hours: "08:00–21:00" },
  { name: "MedFinder Demo · Bole 02", area: "Bole", address: "Bole Road, Atlas area", licenseNumber: "DEMO-AA-002", verified: true, phone: "+251 91 000 1002", latitude: 8.9951, longitude: 38.7725, hours: "08:00–20:00" },
  { name: "MedFinder Demo · Kazanchis", area: "Kazanchis", address: "Ras Desta Damtew Street, Kazanchis", licenseNumber: "DEMO-AA-003", verified: true, phone: "+251 91 000 1003", latitude: 9.0109, longitude: 38.7622, hours: "07:30–20:30" },
  { name: "MedFinder Demo · Piassa", area: "Piassa", address: "Churchill Avenue, Piassa", licenseNumber: "DEMO-AA-004", verified: true, phone: "+251 91 000 1004", latitude: 9.0351, longitude: 38.7521, hours: "08:00–19:00" },
  { name: "MedFinder Demo · Saris", area: "Saris", address: "Saris, near the bus station", licenseNumber: "DEMO-AA-005", verified: true, phone: "+251 91 000 1005", latitude: 8.9468, longitude: 38.7476, hours: "08:00–20:00" },
  { name: "MedFinder Demo · Megenagna", area: "Megenagna", address: "Megenagna roundabout, north side", licenseNumber: "DEMO-AA-006", verified: true, phone: "+251 91 000 1006", latitude: 9.0303, longitude: 38.7973, hours: "08:00–21:00" },
  { name: "MedFinder Demo · Lideta", area: "Lideta", address: "Lideta, near the courthouse", licenseNumber: "DEMO-AA-007", verified: true, phone: "+251 91 000 1007", latitude: 9.0125, longitude: 38.7386, hours: "08:00–19:30" },
  { name: "MedFinder Demo · Arat Kilo", area: "Arat Kilo", address: "King George VI Street, Arat Kilo", licenseNumber: "DEMO-AA-008", verified: true, phone: "+251 91 000 1008", latitude: 9.0354, longitude: 38.7616, hours: "08:00–20:00" },
  { name: "MedFinder Demo · CMC", area: "CMC", address: "CMC Road, near the roundabout", licenseNumber: "DEMO-AA-009", verified: true, phone: "+251 91 000 1009", latitude: 9.0404, longitude: 38.8172, hours: "08:00–20:00" },
  { name: "MedFinder Demo · Mexico", area: "Mexico", address: "Mexico Square, south side", licenseNumber: "DEMO-AA-010", verified: true, phone: "+251 91 000 1010", latitude: 9.0047, longitude: 38.7461, hours: "08:00–20:00" },
  { name: "MedFinder Demo · Gerji", area: "Gerji", address: "Gerji, CMC Road junction", licenseNumber: "DEMO-AA-011", verified: true, phone: "+251 91 000 1011", latitude: 8.9995, longitude: 38.8133, hours: "08:00–20:00" },
  { name: "MedFinder Demo · Sar Bet", area: "Sar Bet", address: "Sar Bet, Africa Avenue extension", licenseNumber: "DEMO-AA-012", verified: true, phone: "+251 91 000 1012", latitude: 8.9867, longitude: 38.7573, hours: "08:00–20:00" },
];

const demoMedicines = [
  { genericName: "Metformin", brandNames: ["Glucophage", "Siofor"], nameAmharic: "ሜትፎርሚን", strength: "500 mg", form: "Tablet", category: "Diabetes" },
  { genericName: "Amlodipine", brandNames: ["Norvasc", "Amlovas"], nameAmharic: "አምሎዲፒን", strength: "5 mg", form: "Tablet", category: "Heart & blood pressure" },
  { genericName: "Amoxicillin", brandNames: ["Amoxil", "Trimox"], nameAmharic: "አሞክሲሲሊን", strength: "500 mg", form: "Capsule", category: "Antibiotic" },
  { genericName: "Salbutamol", brandNames: ["Ventolin", "Asthalin"], nameAmharic: "ሳልቡታሞል", strength: "100 mcg", form: "Inhaler", category: "Respiratory" },
  { genericName: "Losartan", brandNames: ["Cozaar", "Losar"], nameAmharic: "ሎሳርታን", strength: "50 mg", form: "Tablet", category: "Heart & blood pressure" },
  { genericName: "Insulin glargine", brandNames: ["Lantus", "Basaglar"], nameAmharic: "ኢንሱሊን ግላርጂን", strength: "100 IU/ml", form: "Injection", category: "Diabetes" },
  { genericName: "Paracetamol", brandNames: ["Panadol", "Tylenol"], nameAmharic: "ፓራሲታሞል", strength: "500 mg", form: "Tablet", category: "Pain relief" },
  { genericName: "Omeprazole", brandNames: ["Losec", "Prilosec"], nameAmharic: "ኦሜፕራዞል", strength: "20 mg", form: "Capsule", category: "Digestive health" },
  { genericName: "Oral rehydration salts", brandNames: ["ORS", "ReSoMal"], nameAmharic: "የአፍ ውሃ መመለሻ ጨው", strength: "20.5 g", form: "Sachet", category: "Hydration" },
  { genericName: "Cetirizine", brandNames: ["Zyrtec", "Cetrine"], nameAmharic: "ሴቲሪዚን", strength: "10 mg", form: "Tablet", category: "Allergy" },
];

let seedPromise: Promise<void> | undefined;

async function seedDemoInventory() {
  await ensureSeedAccounts();

  const [alreadySeeded] = await db
    .select({ key: appMeta.key })
    .from(appMeta)
    .where(eq(appMeta.key, "demo_seeded"))
    .limit(1);
  if (alreadySeeded) return;

  await db.insert(pharmacies).values(demoPharmacies).onConflictDoNothing();
  await db.insert(medicines).values(demoMedicines).onConflictDoNothing();

  const savedPharmacies = await db.select({ id: pharmacies.id, licenseNumber: pharmacies.licenseNumber }).from(pharmacies);
  const savedMedicines = await db.select({ id: medicines.id, genericName: medicines.genericName }).from(medicines);
  const pharmacyIds = new Map(savedPharmacies.map((pharmacy) => [pharmacy.licenseNumber, pharmacy.id]));
  const medicineIds = new Map(savedMedicines.map((medicine) => [medicine.genericName, medicine.id]));
  const inventory = [];

  for (let pharmacyIndex = 0; pharmacyIndex < demoPharmacies.length; pharmacyIndex += 1) {
    const pharmacy = demoPharmacies[pharmacyIndex];
    const pharmacyId = pharmacyIds.get(pharmacy.licenseNumber);
    if (!pharmacyId) continue;

    for (let medicineIndex = 0; medicineIndex < demoMedicines.length; medicineIndex += 1) {
      const medicine = demoMedicines[medicineIndex];
      const medicineId = medicineIds.get(medicine.genericName);
      if (!medicineId) continue;
      const pattern = (pharmacyIndex * 7 + medicineIndex * 3) % 13;
      const status: StockStatus = pattern === 0 || pattern === 8
        ? "out_of_stock"
        : pattern === 3 || pattern === 10
          ? "low_stock"
          : "in_stock";
      const ageHours = (pharmacyIndex * 11 + medicineIndex * 7) % 39;
      const confirmedAt = new Date(Date.now() - ageHours * 60 * 60 * 1000);
      const quantity = status === "out_of_stock" ? 0 : status === "low_stock" ? 2 + ((pharmacyIndex + medicineIndex) % 4) : 8 + ((pharmacyIndex * 2 + medicineIndex) % 25);

      inventory.push({
        pharmacyId,
        medicineId,
        status,
        quantity,
        priceBirr: 12 + ((pharmacyIndex * 19 + medicineIndex * 13) % 280),
        lastConfirmedAt: confirmedAt,
        updatedAt: confirmedAt,
      });
    }
  }

  if (inventory.length > 0) {
    await db.insert(stocks).values(inventory).onConflictDoNothing();
  }

  await db
    .insert(appMeta)
    .values({ key: "demo_seeded", value: new Date().toISOString() })
    .onConflictDoNothing();
}

export async function ensureDemoData() {
  if (!seedPromise) {
    seedPromise = seedDemoInventory().catch((error: unknown) => {
      seedPromise = undefined;
      throw error;
    });
  }
  await seedPromise;
}
