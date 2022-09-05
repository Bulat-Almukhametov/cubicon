import express from 'express';
import { createCitiesAndRegions, getAllCities } from '../controllers/city.controller';

const router = express.Router();

router.get('/', getAllCities);
router.get('/createCitiesAndRegions', createCitiesAndRegions);

export default router;