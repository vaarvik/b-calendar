import { SearchPlacesUseCase } from './search-places.use-case.js';

export class TestDouble {}
export const subject = new SearchPlacesUseCase({ getById: () => Promise.resolve(null) });
