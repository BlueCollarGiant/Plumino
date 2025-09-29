// Seeding script temporarily disabled. Remove this comment block when ready to seed.
/*
const mongoose = require("mongoose");
const XLSX = require("xlsx");
require("dotenv").config();

// Models
const Extraction = require("./models/extractionModel");
const Fermentation = require("./models/fermentationModel");
const Packaging = require("./models/packagingModel");

// Database connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Load workbook
const workbook = XLSX.readFile("./firstspreadsheets.xlsx");

// Header mapping for shared and stage-specific fields
const headerMap = {
  Date: "date",
  Plant: "plant",
  Product: "product",
  Campaign: "campaign",
  Stage: "stage",
  Tank: "tank",
  "Level Indicator": "levelIndicator",
  pH: "pH",
  "Concentration (g/l)": "concentration",
  "Volume (gal)": "volume",
  "Weight (kg)": "weight",
  "Weight(lbs)": "weight",
  "Received Amount (lbs)": "receivedAmount",
  "Package Type": "packageType",
  "Package": "packageType",
  "Incoming Amount (kg)": "incomingAmountKg",
  "Incoming Amount": "incomingAmountKg",
  "Outgoing Amount (kg)": "outgoingAmountKg",
  "Outgoing Amount": "outgoingAmountKg",
};

function remapRow(row) {
  const mapped = {};

  for (const key in row) {
    if (!headerMap[key]) continue;

    let field = headerMap[key];
    let value = row[key];

    if (field === "date" && value) {
      const parsed = Date.parse(value);
      if (!isNaN(parsed)) {
        value = new Date(parsed);
      } else {
        return null;
      }
    }

    if (["concentration", "volume", "weight", "pH", "incomingAmountKg", "outgoingAmountKg"].includes(field)) {
      value = Number(value) || 0;
    }

    mapped[field] = value;
  }

  mapped.createdAt = new Date();
  return mapped;
}

const extractionData = XLSX.utils
  .sheet_to_json(workbook.Sheets["Extraction"])
  .map(remapRow)
  .filter((row) => row !== null);

const fermentationData = XLSX.utils
  .sheet_to_json(workbook.Sheets["Fermentation"])
  .map(remapRow)
  .filter((row) => row !== null);

const packagingData = XLSX.utils
  .sheet_to_json(workbook.Sheets["Packaging"])
  .map(remapRow)
  .filter((row) => row !== null);

async function seed() {
  try {
    await Extraction.deleteMany({});
    await Fermentation.deleteMany({});
    await Packaging.deleteMany({});

    const res1 = await Extraction.insertMany(extractionData);
    const res2 = await Fermentation.insertMany(fermentationData);
    const res3 = await Packaging.insertMany(packagingData);

    console.log(`Seeded ${res1.length} extractions, ${res2.length} fermentations, ${res3.length} packagings.`);
  } catch (err) {
    console.error("Error seeding data:", err);
  } finally {
    mongoose.connection.close();
  }
}

seed();
*/
