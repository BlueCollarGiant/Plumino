// Seeding script temporarily disabled. Remove this comment block when ready to seed.

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

const numericFields = new Set([
  "concentration",
  "volume",
  "weight",
  "pH",
  "incomingAmountKg",
  "outgoingAmountKg",
  "receivedAmount"
]);

function excelSerialToDate(serial) {
  if (typeof serial !== "number" || !Number.isFinite(serial)) {
    return null;
  }

  const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30); // Excel's day 0 (accounts for 1900 leap bug)
  const milliseconds = Math.round(serial * 86400000); // 24 * 60 * 60 * 1000
  return new Date(EXCEL_EPOCH_UTC + milliseconds);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.-]/g, "").trim();
    if (!normalized) {
      return 0;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function remapRow(row) {
  const mapped = {};

  for (const key in row) {
    if (!headerMap[key]) continue;

    let field = headerMap[key];
    let value = row[key];

    if (field === "date" && value) {
      if (typeof value === "number") {
        const excelDate = excelSerialToDate(value);
        if (!excelDate) {
          return null;
        }
        value = excelDate;
      } else {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
          value = new Date(parsed);
        } else {
          return null;
        }
      }
    }

    if (numericFields.has(field)) {
      value = toNumber(value);
    }

    mapped[field] = value;
  }

  mapped.createdAt = new Date();
  mapped.approved = true; // Mark all seeded data as approved
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

