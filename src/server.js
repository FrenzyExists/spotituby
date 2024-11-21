import authRoutes from './routes.js';
import express from 'express';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/', authRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});