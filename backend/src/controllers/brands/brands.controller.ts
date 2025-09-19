import {NextFunction, Request, Response} from "express";
import {BrandMediator} from "@/mediators/brands/BrandMediator";

class BrandsController {
    async getAllBrands(req: Request, res: Response, next: NextFunction): Promise<void> {
        const brands = await BrandMediator.getAllBrands();
        res.json({
            success: true,
            message: 'Brands retrieved successfully',
            data: brands
        });
    }

    async getBrandById(req: Request, res: Response, next: NextFunction): Promise<void> {
        const brandId = parseInt(req.params.id);
        if (isNaN(brandId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid brand ID'
            });
            return;
        }

        const brand = await BrandMediator.getBrandById(brandId);
        res.json({
            success: true,
            message: 'Brand retrieved successfully',
            data: brand
        });
    }

    async createBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
        const brand = await BrandMediator.createBrand(req.body);
        res.status(201).json({
            success: true,
            message: 'Brand created successfully',
            data: brand
        });
    }

    async updateBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
        const brandId = parseInt(req.params.id);
        if (isNaN(brandId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid brand ID'
            });
            return;
        }

        const brand = await BrandMediator.updateBrand(brandId, req.body);
        res.json({
            success: true,
            message: 'Brand updated successfully',
            data: brand
        });
    }

    async deleteBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
        const brandId = parseInt(req.params.id);
        if (isNaN(brandId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid brand ID'
            });
            return;
        }

        await BrandMediator.deleteBrand(brandId);
        res.json({
            success: true,
            message: 'Brand deleted successfully'
        });
    }

    async getBrandsByStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        const status = req.params.status as 'active' | 'inactive';
        if (!['active', 'inactive'].includes(status)) {
            res.status(400).json({
                success: false,
                message: 'Invalid status. Must be active or inactive'
            });
            return;
        }

        const brands = await BrandMediator.getBrandsByStatus(status === 'active');
        res.json({
            success: true,
            message: `Brands with status ${status} retrieved successfully`,
            data: brands
        });
    }
}

export default new BrandsController();