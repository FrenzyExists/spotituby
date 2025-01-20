import { exec } from "child_process";


import Server from './server.js';

const ServerManager = class {
  constructor() {
    this.serverInstance = null;
  }

  /**
   * Kills any process running on the specified port.
   *
   * @param {number} port - The port number to check.
   * @returns {Promise<void>}
   * @exports killPort
   */
  static killPort = (port) => {
    return new Promise((resolve, reject) => {
      const command = process.platform === 'win32'
        ? `netstat -ano | findstr :${port}` // Windows command
        : `lsof -t -i:${port}`; // Unix command

      exec(command, (error, stdout) => {
        if (error) {
          // If the error is due to no processes found, we can ignore it
          if (stdout.trim() === '') {
            return resolve(); // No processes found, resolve without error
          }
          return reject(error); // Some other error occurred
        }

        const pids = stdout.split('\n').filter(Boolean);
        if (pids.length > 0) {
          const killCommand = process.platform === 'win32'
            ? `taskkill /PID ${pids.join(' /PID ')} /F` // Windows kill command
            : `kill -9 ${pids.join(' ')}`; // Unix kill command

          exec(killCommand, (killError) => {
            if (killError) {
              return reject(killError);
            }
            console.log(`Killed process(es) running on port ${port}`);
            resolve();
          });
        } else {
          resolve(); // No process found on the port
        }
      });
    });
  };

  startServer() {
    if (this.serverInstance) {
      console.log('Server is already running.');
      return;
    }

    this.serverInstance = new Server();
    this.serverInstance.runServer();
  }

  stopServer() {
    if (!this.serverInstance) {
      console.log('No server is currently running.');
      return;
    }

    this.serverInstance.stopServer();
    this.serverInstance = null;
  }

  async resetServer() {
    try {
      console.log('Resetting server...');
      this.stopServer();
      this.startServer();
      console.log('Server has been reset.');
    } catch (error) {
      console.error('Failed to reset the server:', error.message);
      throw error;
    }
  }
}

export default ServerManager;
