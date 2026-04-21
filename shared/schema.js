const { z } = require("zod");

const SHIFT_TYPES = ["FHD", "BHD", "Part Time", "Vacation"];

const AssociateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  shiftType: z.enum(SHIFT_TYPES),
  active: z.boolean().default(true)
});

const PoolRuleSchema = z.object({
  sunWed: z.boolean(),
  wedSat: z.boolean(),
  partTime: z.boolean(),
  skip: z.boolean()
});

module.exports = {
  SHIFT_TYPES,
  AssociateSchema,
  PoolRuleSchema
};
