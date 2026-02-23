import { Request, Response, NextFunction } from "express";
import EcomMediator from "../mediators/EcomMediator";
import { MyLogger } from "@/utils/new-logger";

class EcomController {
  async getPublicSliders(req: Request, res: Response, next: NextFunction) {
    const action = "Get Public Sliders";
    try {
      const sliders = await EcomMediator.getAllSliders(false);
      res.json(sliders);
    } catch (error) {
      next(error);
    }
  }

  async getAllSliders(req: Request, res: Response, next: NextFunction) {
    const action = "Get All Sliders (Admin)";
    try {
      const sliders = await EcomMediator.getAllSliders(true);
      res.json(sliders);
    } catch (error) {
      next(error);
    }
  }

  async getSliderById(req: Request, res: Response, next: NextFunction) {
    try {
      const slider = await EcomMediator.getSliderById(req.params.id);
      res.json(slider);
    } catch (error) {
      next(error);
    }
  }

  async createSlider(req: Request, res: Response, next: NextFunction) {
    try {
      const slider = await EcomMediator.createSlider(req.body);
      res.status(201).json(slider);
    } catch (error) {
      next(error);
    }
  }

  async updateSlider(req: Request, res: Response, next: NextFunction) {
    try {
      const slider = await EcomMediator.updateSlider(req.params.id, req.body);
      res.json(slider);
    } catch (error) {
      next(error);
    }
  }

  deleteSlider = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await EcomMediator.deleteSlider(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  uploadSliderImage = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const imageUrl = `/uploads/ecommerce/sliders/${req.file.filename}`;
      res.status(200).json({ imageUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

export default new EcomController();
