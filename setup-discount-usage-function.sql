-- Function to increment discount usage count
CREATE OR REPLACE FUNCTION increment_discount_usage(discount_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE discounts
  SET used_count = COALESCE(used_count, 0) + 1
  WHERE id = discount_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_discount_usage TO authenticated;
