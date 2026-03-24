import { apiClient } from '../client';

export type CategoryType = 'INCOME' | 'EXPENSE';

export interface CategoryResponse {
  categoryId: number;
  categoryName: string;
  categoryType: CategoryType;
  isSystem: boolean;
  createdAt: string;
}

export interface CategoryRequest {
  categoryName: string;
  categoryType: CategoryType;
}

export const categoriesApi = {
  getAll: () => 
    apiClient.get<CategoryResponse[]>('/categories'),

  getByType: (type: CategoryType) => 
    apiClient.get<CategoryResponse[]>(`/categories/type/${type}`),

  getSystemCategories: () => 
    apiClient.get<CategoryResponse[]>('/categories/system'),

  getById: (categoryId: number) => 
    apiClient.get<CategoryResponse>(`/categories/${categoryId}`),

  create: (data: CategoryRequest) => 
    apiClient.post<CategoryResponse>('/categories', data),

  update: (categoryId: number, data: Partial<CategoryRequest>) =>
    apiClient.put<CategoryResponse>(`/categories/${categoryId}`, data),

  delete: (categoryId: number) => 
    apiClient.delete(`/categories/${categoryId}`),
};
