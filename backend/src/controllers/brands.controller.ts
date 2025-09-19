import {NextFunction, Request, Response} from "express";
import {BrandMediator} from "@/mediators/brands/BrandMediator";

class BrandsController {
    async getAllBrands(req: Request, res: Response, next: NextFunction) {
        const brands = await BrandMediator.getAllBrands();
        res.json({
            success: true,
            message: 'Brands retrieved successfully',
            data: brands
        });
    }
}

export default new BrandsController();