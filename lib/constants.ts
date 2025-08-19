export const CATEGORY_TYPES = ['สินค้าหลัก', 'สินค้าทางเลือก'] as const;
export type CategoryType = typeof CATEGORY_TYPES[number];
