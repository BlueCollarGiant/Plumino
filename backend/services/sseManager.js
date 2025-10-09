// SSE connection manager for real-time notifications
class SSEManager {
  constructor() {
    this.connections = new Map(); // userId -> response object
  }

  // Add a new SSE connection
  addConnection(userId, res) {
    this.connections.set(userId, res);
    console.log(`SSE connection established for user ${userId}`);
    
    // Clean up on connection close
    res.on('close', () => {
      this.connections.delete(userId);
      console.log(`SSE connection closed for user ${userId}`);
    });
  }

  // Send notification to specific user
  notifyUser(userId, event, data) {
    const connection = this.connections.get(userId);
    if (connection && !connection.destroyed) {
      try {
        connection.write(`event: ${event}\n`);
        connection.write(`data: ${JSON.stringify(data)}\n\n`);
        console.log(`SSE notification sent to user ${userId}:`, event);
      } catch (error) {
        console.error(`Failed to send SSE to user ${userId}:`, error);
        this.connections.delete(userId);
      }
    }
  }

  // Send role change notification
  notifyRoleChange(userId, changes) {
    this.notifyUser(userId, 'roleChange', {
      message: this.buildRoleChangeMessage(changes),
      changes,
      timestamp: new Date().toISOString()
    });
  }

  // Send department change notification  
  notifyDepartmentChange(userId, changes) {
    this.notifyUser(userId, 'departmentChange', {
      message: this.buildDepartmentChangeMessage(changes),
      changes,
      timestamp: new Date().toISOString()
    });
  }

  // Build user-friendly messages
  buildRoleChangeMessage(changes) {
    const { oldRole, newRole, name } = changes;
    return `🎉 Congratulations ${name}! You've been promoted from ${oldRole} to ${newRole}. Log out and back in when you're ready to access your new features!`;
  }

  buildDepartmentChangeMessage(changes) {
    const { oldDepartment, newDepartment, name } = changes;
    return `📋 Hi ${name}! You've been transferred from ${oldDepartment} to ${newDepartment} department. Log out and back in to access your new workspace!`;
  }

  // Get connection count for monitoring
  getConnectionCount() {
    return this.connections.size;
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.connections.has(userId);
  }
}

// Create singleton instance
const sseManager = new SSEManager();

module.exports = { sseManager };