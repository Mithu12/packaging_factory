import pool from "@/database/connection";
import { EcommerceSlider, CreateSliderRequest, UpdateSliderRequest } from "@/types/ecommerce";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";
import { deleteSliderImage } from "@/utils/file-utils";

class EcomMediator {
  private async getClient() {
    return await pool.connect();
  }

  async getAllSliders(includeInactive = false): Promise<EcommerceSlider[]> {
    const action = "Get All Sliders";
    try {
      MyLogger.info(action);
      const client = await this.getClient();
      try {
        const query = `
          SELECT * FROM ecommerce_sliders 
          ${includeInactive ? "" : "WHERE is_active = true"}
          ORDER BY order_index ASC, created_at DESC
        `;
        const result = await client.query(query);
        MyLogger.success(action, { count: result.rows.length });
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      MyLogger.error(action, error);
      throw createError("Failed to fetch sliders", 500);
    }
  }

  async getSliderById(id: string): Promise<EcommerceSlider> {
    const action = "Get Slider By Id";
    try {
      MyLogger.info(action, { id });
      const client = await this.getClient();
      try {
        const query = "SELECT * FROM ecommerce_sliders WHERE id = $1";
        const result = await client.query(query, [id]);
        if (result.rows.length === 0) {
          throw createError("Slider not found", 404);
        }
        return result.rows[0];
      } finally {
        client.release();
      }
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  async createSlider(data: CreateSliderRequest): Promise<EcommerceSlider> {
    const action = "Create Slider";
    try {
      MyLogger.info(action, data);
      const client = await this.getClient();
      try {
        const query = `
          INSERT INTO ecommerce_sliders (title, description, image_url, link_url, order_index, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        const result = await client.query(query, [
          data.title,
          data.description || null,
          data.image_url,
          data.link_url || null,
          data.order_index || 0,
          data.is_active !== undefined ? data.is_active : true,
        ]);
        MyLogger.success(action, { id: result.rows[0].id });
        return result.rows[0];
      } finally {
        client.release();
      }
    } catch (error) {
      MyLogger.error(action, error);
      throw createError("Failed to create slider", 500);
    }
  }

  async updateSlider(id: string, data: UpdateSliderRequest): Promise<EcommerceSlider> {
    const action = "Update Slider";
    try {
      MyLogger.info(action, { id, ...data });
      const client = await this.getClient();
      try {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.title !== undefined) {
          fields.push(`title = $${i++}`);
          values.push(data.title);
        }
        if (data.description !== undefined) {
          fields.push(`description = $${i++}`);
          values.push(data.description);
        }
        if (data.image_url !== undefined) {
          fields.push(`image_url = $${i++}`);
          values.push(data.image_url);
        }
        if (data.link_url !== undefined) {
          fields.push(`link_url = $${i++}`);
          values.push(data.link_url);
        }
        if (data.order_index !== undefined) {
          fields.push(`order_index = $${i++}`);
          values.push(data.order_index);
        }
        if (data.is_active !== undefined) {
          fields.push(`is_active = $${i++}`);
          values.push(data.is_active);
        }

        if (fields.length === 0) {
          return await this.getSliderById(id);
        }

        // --- Image Cleanup Logic ---
        if (data.image_url !== undefined) {
          const oldSlider = await this.getSliderById(id);
          if (oldSlider.image_url && oldSlider.image_url !== data.image_url) {
            await deleteSliderImage(oldSlider.image_url);
          }
        }
        // ---------------------------

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `
          UPDATE ecommerce_sliders 
          SET ${fields.join(", ")}
          WHERE id = $${i}
          RETURNING *
        `;
        const result = await client.query(query, values);
        if (result.rows.length === 0) {
          throw createError("Slider not found", 404);
        }
        MyLogger.success(action, { id });
        return result.rows[0];
      } finally {
        client.release();
      }
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  async deleteSlider(id: string): Promise<void> {
    const action = "Delete Slider";
    try {
      MyLogger.info(action, { id });
      const client = await this.getClient();
      try {
        // --- Image Cleanup Logic ---
        const slider = await this.getSliderById(id);
        if (slider.image_url) {
          await deleteSliderImage(slider.image_url);
        }
        // ---------------------------

        const query = "DELETE FROM ecommerce_sliders WHERE id = $1";
        const result = await client.query(query, [id]);
        if (result.rowCount === 0) {
          throw createError("Slider not found", 404);
        }
        MyLogger.success(action, { id });
      } finally {
        client.release();
      }
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }
}

export default new EcomMediator();
