const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Models
const Employee = require("./models/employeeModel");

// Database connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Employee seed data
const employeeData = [
  {
    name: "John Admin",
    email: "admin@plumino.com",
    password: "admin123",
    role: "admin",
    department: "office"
  },
  {
    name: "Sarah HR Manager",
    email: "hr@plumino.com", 
    password: "hr123",
    role: "hr",
    department: "office"
  },
  {
    name: "Jane Supervisor",
    email: "supervisor@plumino.com", 
    password: "supervisor123",
    role: "supervisor",
    department: "fermentation"
  },
  {
    name: "Bob Operator",
    email: "operator@plumino.com",
    password: "operator123", 
    role: "operator",
    department: "extraction"
  },
  {
    name: "Alice Smith",
    email: "alice@plumino.com",
    password: "alice123",
    role: "operator",
    department: "packaging"
  },
  {
    name: "Mike Johnson", 
    email: "mike@plumino.com",
    password: "mike123",
    role: "supervisor",
    department: "extraction"
  },
  {
    name: "Lisa HR Assistant",
    email: "lisa@plumino.com",
    password: "lisa123",
    role: "hr",
    department: "office"
  },
  {
    name: "Tom Fermentation Worker",
    email: "tom@plumino.com",
    password: "tom123",
    role: "operator",
    department: "fermentation"
  },
  {
    name: "Emma Packaging Supervisor",
    email: "emma@plumino.com",
    password: "emma123",
    role: "supervisor",
    department: "packaging"
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
  } finally {
    mongoose.connection.close();
  }
}

seedEmployees();