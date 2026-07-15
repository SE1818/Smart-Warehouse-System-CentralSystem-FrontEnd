export interface ProductIndex {
	id: string;
	sku: string;
	name: string;
	description: string;
	price: number;
	stockQuantity: number;
	storeId?: string;
	storeName?: string;
	imageUrl?: string;
}

export interface AskRequest {
	question: string;
}

export interface AskResponse {
	answer: string;
	contextProducts: ProductIndex[];
}

export interface ProductStoreGroup {
	storeId: string;
	storeName: string;
	products: ProductIndex[];
}

export interface SearchResponseGrouped {
	products: ProductIndex[];
	groupedByStore?: ProductStoreGroup[];
	filteredByStore?: boolean;
	storeId?: string;
}
