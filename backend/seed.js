const mongoose = require("mongoose");
const XLSX = require("xlsx");
require("dotenv").config();

// Models
const Extraction = require("./models/extractionModel");
const Fermentation = require("./models/fermentationModel");
const Packaging = require("./models/packagingModel");
const Employee = require("./models/employeeModel");

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
  mapped.status = 'approved'; // Mark all seeded data as approved
  // Note: Most seeded data will have no createdBy (legacy data)
  // This allows operators to see historical records
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
    // Get operator users for optional assignment to some records
    const operators = await Employee.find({ role: 'operator' }).select('_id');
    const operatorIds = operators.map(op => op._id);

    await Extraction.deleteMany({});
    await Fermentation.deleteMany({});
    await Packaging.deleteMany({});

    // Enhance some records with createdBy for testing
    const enhancedExtractionData = extractionData.map((record, index) => {
      // Assign every 4th record to a random operator for testing
      if (index % 4 === 0 && operatorIds.length > 0) {
        const randomOperator = operatorIds[Math.floor(Math.random() * operatorIds.length)];
        return { ...record, createdBy: randomOperator };
      }
      return record; // Keep most as legacy data (no createdBy)
    });

    const enhancedFermentationData = fermentationData.map((record, index) => {
      if (index % 4 === 0 && operatorIds.length > 0) {
        const randomOperator = operatorIds[Math.floor(Math.random() * operatorIds.length)];
        return { ...record, createdBy: randomOperator };
      }
      return record;
    });

    const enhancedPackagingData = packagingData.map((record, index) => {
      if (index % 4 === 0 && operatorIds.length > 0) {
        const randomOperator = operatorIds[Math.floor(Math.random() * operatorIds.length)];
        return { ...record, createdBy: randomOperator };
      }
      return record;
    });

    const res1 = await Extraction.insertMany(enhancedExtractionData);
    const res2 = await Fermentation.insertMany(enhancedFermentationData);
    const res3 = await Packaging.insertMany(enhancedPackagingData);

    console.log(`Seeded ${res1.length} extractions, ${res2.length} fermentations, ${res3.length} packagings.`);
    console.log('Note: Most records are legacy data (no createdBy), some are assigned to operators for testing.');
  } catch (err) {
    console.error("Error seeding data:", err);
  } finally {
    mongoose.connection.close();
  }
}

seed();

