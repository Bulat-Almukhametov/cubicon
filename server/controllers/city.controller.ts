import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { prisma } from "..";

export const createCitiesAndRegions = async (req: any, res: any) => {
    try {
        const citiesAndRegionsData: {
            region: string,
            city: string
        }[] = await fetch('https://gist.githubusercontent.com/gorborukov/0722a93c35dfba96337b/raw/435b297ac6d90d13a68935e1ec7a69a225969e58/russia',
        {
            method: 'GET'
        }).then((r: any) => r.json());
    
        const uniqueRegionNames = citiesAndRegionsData.map(e => e.region).filter((v, i, s) => s.indexOf(v) === i);

        // add unique filter, Tatarstan contains duplicated cities
        const citiesGroupedByRegions = uniqueRegionNames.map(rn => {
            return {
                region: rn,
                cities: citiesAndRegionsData
                    .filter(e => e.region === rn)
                    .map(e => e.city)
                    .filter((v, i, s) => s.indexOf(v) === i),
            };
        });

        const results = await prisma.$transaction(citiesGroupedByRegions.map(e => {
            return prisma.region.create({
                data: {
                    name: e.region,
                    cities: {
                        create: e.cities.map(cn => {
                            return {
                                name: cn,
                            };
                        }),
                    }
                },
            })
        })).catch((err) => {
            if (err instanceof PrismaClientKnownRequestError) {
                res.status(500).json({
                    code: err.code,
                    meta: err.meta,
                    message: err.message,
                    name: err.name,
                });

                return;
              }

              res.status(500).json(err)
        });
        
        res.status(500).json(results);
    }
    catch (error: any) {
        res.status(500).json({ 
            meta: 'common error happened',
            message: error.message 
        });
    }   
};

export const getAllCities = async (req: any, res: any) => {
    try {
        const cities = await prisma.city.findMany({
            include: {
                region: true,
            }
        });

        res.status(200).json(cities);
    }
    catch (error: any) {
        res.status(500).json({ message: error.message });
    }   
};
