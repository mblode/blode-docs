import { z } from "zod";

export const PaginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const PageInfoSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});
export type PageInfo = z.infer<typeof PageInfoSchema>;

export const createListResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    pageInfo: PageInfoSchema.optional(),
  });
