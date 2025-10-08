const RoleChange = require('../models/roleChangeModel');
const { sseManager } = require('./sseManager');

class AutoLogoutManager {
  constructor() {
    this.scheduledLogouts = new Map(); // employeeId -> timeoutId
    this.startCleanupInterval();
  }

  // Track a role change and schedule 24-hour auto-logout
  async trackRoleChange(employeeId, oldRole, newRole, oldDepartment = null, newDepartment = null) {
    try {
      // Create role change record
      const roleChange = new RoleChange({
        employeeId,
        oldRole,
        newRole,
        oldDepartment,
        newDepartment,
        changeTimestamp: new Date()
      });

      await roleChange.save();
      console.log(`📝 Role change tracked for employee ${employeeId}: ${oldRole} → ${newRole}`);

      // Schedule 24-hour auto-logout
      this.scheduleAutoLogout(employeeId, roleChange._id);

    } catch (error) {
      console.error('Failed to track role change:', error);
    }
  }

  // Schedule auto-logout in 24 hours
  scheduleAutoLogout(employeeId, roleChangeId) {
    // Cancel any existing timeout for this employee
    this.cancelScheduledLogout(employeeId);

    // Schedule new 24-hour timeout
    const timeoutId = setTimeout(async () => {
      await this.executeAutoLogout(employeeId, roleChangeId);
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

    this.scheduledLogouts.set(employeeId.toString(), timeoutId);
    
    console.log(`⏰ 24-hour auto-logout scheduled for employee ${employeeId}`);
  }

  // Execute the auto-logout
  async executeAutoLogout(employeeId, roleChangeId) {
    try {
      // Check if user has logged out since the role change
      const roleChange = await RoleChange.findById(roleChangeId);
      if (!roleChange || roleChange.hasLoggedOutSince) {
        console.log(`✅ Employee ${employeeId} already logged out since role change`);
        return;
      }

      // Send final warning notification
      sseManager.notifyUser(employeeId.toString(), 'forceLogout', {
        message: '🔒 Your session has expired due to role changes. You will be automatically logged out in 10 seconds.',
        countdown: 10,
        timestamp: new Date().toISOString()
      });

      // Force logout after 10 second warning
      setTimeout(() => {
        sseManager.notifyUser(employeeId.toString(), 'sessionExpired', {
          message: 'Your session has been terminated due to role changes. Please log in again.',
          forceLogout: true,
          timestamp: new Date().toISOString()
        });

        console.log(`🔒 Force logged out employee ${employeeId} after 24 hours`);
      }, 10000);

      // Mark as auto-logout executed
      await RoleChange.findByIdAndUpdate(roleChangeId, { 
        autoLogoutScheduled: true 
      });

    } catch (error) {
      console.error('Failed to execute auto-logout:', error);
    } finally {
      // Clean up the scheduled timeout
      this.scheduledLogouts.delete(employeeId.toString());
    }
  }

  // Cancel scheduled logout (called when user logs out voluntarily)
  cancelScheduledLogout(employeeId) {
    const timeoutId = this.scheduledLogouts.get(employeeId.toString());
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledLogouts.delete(employeeId.toString());
      console.log(`❌ Cancelled auto-logout for employee ${employeeId}`);
    }
  }

  // Mark that user has logged out since role change
  async markUserLoggedOut(employeeId) {
    try {
      // Mark all pending role changes as resolved
      await RoleChange.updateMany(
        { 
          employeeId, 
          hasLoggedOutSince: false 
        },
        { 
          hasLoggedOutSince: true 
        }
      );

      // Cancel any scheduled auto-logout
      this.cancelScheduledLogout(employeeId);
      
      console.log(`✅ Marked employee ${employeeId} as logged out since role changes`);
    } catch (error) {
      console.error('Failed to mark user as logged out:', error);
    }
  }

  // Get pending role changes for a user
  async getPendingRoleChanges(employeeId) {
    try {
      return await RoleChange.find({
        employeeId,
        hasLoggedOutSince: false
      }).sort({ changeTimestamp: -1 });
    } catch (error) {
      console.error('Failed to get pending role changes:', error);
      return [];
    }
  }

  // Cleanup expired role changes every hour
  startCleanupInterval() {
    setInterval(async () => {
      try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Find role changes older than 24 hours that haven't been resolved
        const expiredChanges = await RoleChange.find({
          changeTimestamp: { $lt: oneDayAgo },
          hasLoggedOutSince: false,
          autoLogoutScheduled: false
        });

        // Force logout for these users
        for (const change of expiredChanges) {
          await this.executeAutoLogout(change.employeeId, change._id);
        }

        console.log(`🧹 Cleanup processed ${expiredChanges.length} expired role changes`);
      } catch (error) {
        console.error('Cleanup interval error:', error);
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  // Get system stats
  getStats() {
    return {
      scheduledLogouts: this.scheduledLogouts.size,
      activeTimeouts: Array.from(this.scheduledLogouts.keys())
    };
  }
}

// Create singleton instance
const autoLogoutManager = new AutoLogoutManager();

module.exports = { autoLogoutManager };