import express from 'express';
import { createCitiesAndRegions } from '../controllers/city.controller';

const router = express.Router();

router.get('/createCitiesAndRegions', createCitiesAndRegions);

export default router;