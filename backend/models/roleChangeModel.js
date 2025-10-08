const mongoose = require('mongoose');

// Track role changes and their timestamps for 24-hour auto-logout
const roleChangeSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  oldRole: {
    type: String,
    required: true
  },
  newRole: {
    type: String,
    required: true
  },
  oldDepartment: {
    type: String,
    required: false
  },
  newDepartment: {
    type: String,
    required: false
  },
  changeTimestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  hasLoggedOutSince: {
    type: Boolean,
    default: false
  },
  autoLogoutScheduled: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true,
  // Auto-delete records older than 30 days
  expires: 2592000 // 30 days in seconds
});

// Index for efficient querying
roleChangeSchema.index({ employeeId: 1, changeTimestamp: -1 });
roleChangeSchema.index({ hasLoggedOutSince: 1, autoLogoutScheduled: 1 });

module.exports = mongoose.model('RoleChange', roleChangeSchema);