-- Introduce a third inventory primary category: Ready Raw Materials (RRM).
-- Sits alongside Raw Materials (RM) and Ready Goods (FG). RRM products are
-- intermediate goods produced from RM and consumed by FG production.

INSERT INTO categories (name, description)
VALUES
    ('Ready Raw Materials', 'Intermediate goods produced from raw materials, used as components in finished goods')
ON CONFLICT (name) DO NOTHING;
