import express, { Express } from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import contests from './routes/contest';
import rounds from './routes/round';
import results from './routes/result';
import cities from './routes/city';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import userRoutes from './routes/user.routes';

dotenv.config();

export const prisma = new PrismaClient();
export const router = express.Router();
const PORT = process.env.PORT || 3000;

const app: Express = express();

app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors())

app.use('/users', userRoutes);
app.use('/contests', contests);
app.use('/rounds', rounds);
app.use('/results', results);
app.use('/cities', cities);

app.listen(PORT, () => console.log(`Running on ${PORT} ⚡`));
