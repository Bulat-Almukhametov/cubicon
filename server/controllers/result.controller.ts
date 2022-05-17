import { Result } from "@prisma/client";
import { ServerResponse } from "http";
import { prisma } from "..";

export const getAllResults = async (req: any, res: any) => {
    try {
        const postMessages = await prisma.result.findMany();

        res.status(200).json(postMessages);
    }
    catch (error: any) {
        res.status(404).json({ message: error.message });
    }   
};

export const createResults = async (req: any, res: any) => {
    try {
        const results: Result[] = req.body;

        for (let r of results) {
            const results = [ r.attempt1, r.attempt2, r.attempt3, r.attempt4, r.attempt5 ];
            const worst = results.reduce((prev, cur) => cur > prev ? cur : prev, results[0]);
            const best = results.reduce((prev, cur) => cur < prev ? cur : prev, results[0]);
    
            const withoutBestAndWorst: number[] = results.filter((_, i) => i !== results.indexOf(worst) && i !== results.indexOf(best));
    
            const avg = Math.floor(withoutBestAndWorst.reduce((prev, cur) => prev + cur, 0) / 3);

            if (avg !== r.average) {
                res.status(400).json({ message: 'average is incorrect! '});

                return;
            }
        }
        
        await prisma.result.deleteMany({
            where: {
                roundId: {
                    in: results.map(r => r.roundId),
                }
            }
        })

        const creationResult = await prisma.result.createMany({
            data: results.map((r: Result) => {
                return {
                    attempt1: r.attempt1,
                    attempt2: r.attempt2,
                    attempt3: r.attempt3,
                    attempt4: r.attempt4,
                    attempt5: r.attempt5,
                    best: r.best,
                    average: r.average,
                    roundId: r.roundId,
                    performedByStr: r.performedByStr,
                    performedById: r.performedById,
                }
            }),
            skipDuplicates: true,
        });

        res.status(204).json(creationResult);
    }
    catch (error: any) {
        res.status(500).json({ message: error.message });
        res.end();

        return;
    }   
};

export const deleteResult = async (req: any, res: any) => {
    try {
        const id = +req.params.id;

        const deletedResult = await prisma.result.delete({ 
            where: {
                id
            }
        });

        res.status(200).json(deletedResult);
    }
    catch (error: any) {
        res.status(404).json({ message: error.message });
    }   
};

export const updateResult = async (req: any, res: any) => {
    try {
        const id = +req.params.id;
        const updatedData = req.body;

        const updatedResult: Result = await prisma.result.update({ 
            where: {
                id
            },
            data: updatedData
        });

        res.status(200).json(updatedResult);
    }
    catch (error: any) {
        res.status(404).json({ message: error.message });
    }   
};
