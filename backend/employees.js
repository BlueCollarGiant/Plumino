const mongoose = require("mongoose");
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
    role: "admin"
  },
  {
    name: "Sarah HR Manager",
    email: "hr@plumino.com", 
    password: "hr123",
    role: "hr"
  },
  {
    name: "Jane Supervisor",
    email: "supervisor@plumino.com", 
    password: "supervisor123",
    role: "supervisor"
  },
  {
    name: "Bob Employee",
    email: "employee@plumino.com",
    password: "employee123", 
    role: "employee"
  },
  {
    name: "Alice Smith",
    email: "alice@plumino.com",
    password: "alice123",
    role: "employee"
  },
  {
    name: "Mike Johnson", 
    email: "mike@plumino.com",
    password: "mike123",
    role: "supervisor"
  },
  {
    name: "Lisa HR Assistant",
    email: "lisa@plumino.com",
    password: "lisa123",
    role: "hr"
  }
];

async function seedEmployees() {
  try {
    // Clear existing employees
    await Employee.deleteMany({});
    console.log("Cleared existing employees");

    // Insert new employee data
    const result = await Employee.insertMany(employeeData);
    
    console.log(`Successfully seeded ${result.length} employees:`);
    result.forEach(emp => {
      console.log(`- ${emp.name} (${emp.email}) - Role: ${emp.role}`);
    });
    
  } catch (err) {
    console.error("Error seeding employees:", err);
  } finally {
    mongoose.connection.close();
  }
}

seedEmployees();