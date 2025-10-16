const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config();

// Render runs `npm install` followed by `npm run postinstall`, so ensure MONGO_URI is set in Render's dashboard.

const { MONGO_URI } = process.env;

if (!MONGO_URI) {
  console.error("Missing MONGO_URI environment variable. Set it locally or in Render's dashboard.");
  process.exit(1);
}

// Models
const Employee = require("./models/employeeModel");

// Employee seed data
const employeeData = [
  {
    name: "John Admin",
    email: "admin@plumino.com",
    password: "admin123",
    role: "admin",
    department: "office",
    title: "System Administrator"
  },
  {
    name: "Sarah HR Manager",
    email: "hr@plumino.com", 
    password: "hr123",
    role: "hr",
    department: "office",
    title: "HR Manager"
  },
  {
    name: "Jane Supervisor",
    email: "supervisor@plumino.com", 
    password: "supervisor123",
    role: "supervisor",
    department: "fermentation",
    title: "Fermentation Supervisor"
  },
  {
    name: "Bob Operator",
    email: "operator@plumino.com",
    password: "operator123", 
    role: "operator",
    department: "extraction",
    title: "Extraction Operator"
  },
  {
    name: "Alice Smith",
    email: "alice@plumino.com",
    password: "alice123",
    role: "operator",
    department: "packaging",
    title: "Packaging Operator"
  },
  {
    name: "Mike Johnson", 
    email: "mike@plumino.com",
    password: "mike123",
    role: "supervisor",
    department: "extraction",
    title: "Extraction Supervisor"
  },
  {
    name: "Lisa HR Assistant",
    email: "lisa@plumino.com",
    password: "lisa123",
    role: "hr",
    department: "office",
    title: "HR Assistant"
  },
  {
    name: "Tom Fermentation Worker",
    email: "tom@plumino.com",
    password: "tom123",
    role: "operator",
    department: "fermentation",
    title: "Fermentation Technician"
  },
  {
    name: "Emma Packaging Supervisor",
    email: "emma@plumino.com",
    password: "emma123",
    role: "supervisor",
    department: "packaging",
    title: "Packaging Supervisor"
  }
];

async function seedEmployees() {
  try {
    // Clear existing employees
    await Employee.deleteMany({});

    // Hash passwords before inserting
    const hashedEmployeeData = await Promise.all(
      employeeData.map(async (emp) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(emp.password, salt);
        return {
          ...emp,
          password: hashedPassword
        };
      })
    );

    // Insert new employee data with hashed passwords
    const result = await Employee.insertMany(hashedEmployeeData);
    
    console.log(`Seeded ${result.length} employees.`);
    
  } catch (err) {
    console.error("Error seeding employees:", err);
    throw err;
  }
}

async function main() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
    await seedEmployees();
    console.log("Seeding complete");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

main();
