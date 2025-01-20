import authRoutes from './routes.js';
import express from 'express';

const Server = class {
    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.app.use('/', authRoutes);
        this.serverInstance = null; // Reference to the running server
    }

    runServer = () => {
        this.serverInstance = this.app.listen(SERVER_PORT, () => {
            console.log(`Server running on http://localhost:${SERVER_PORT}`);
        });
    }

    stopServer = () => {
        if (this.serverInstance) {
            this.serverInstance.close(() => {
                console.log('Server stopped.');
            });
            this.serverInstance = null;
        } else {
            console.log('No server instance to stop.');
        }
    }
}

export default Server;