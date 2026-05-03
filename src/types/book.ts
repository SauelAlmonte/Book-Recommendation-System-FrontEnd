import { z } from "zod";

export const bookSchema = z.object({
  isbn13: z.union([z.number(), z.null()]),
  title: z.string(),
  authors: z.string(),
  description_preview: z.string(),
  thumbnail_url: z.string(),
});

export const booksResponseSchema = z.array(bookSchema);

export type Book = z.infer<typeof bookSchema>;
