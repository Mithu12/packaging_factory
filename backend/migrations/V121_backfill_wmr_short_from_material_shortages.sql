-- Align work_order_material_requirements.status with open material_shortages
-- so has_material_shortages and Create PO UI reflect real shortages.

UPDATE work_order_material_requirements wmr
SET
  status = 'short',
  updated_at = CURRENT_TIMESTAMP
FROM material_shortages ms
WHERE ms.work_order_id = wmr.work_order_id
  AND ms.material_id = wmr.material_id
  AND ms.status = 'open'
  AND wmr.status = 'pending'
  AND wmr.allocated_quantity < wmr.required_quantity;
