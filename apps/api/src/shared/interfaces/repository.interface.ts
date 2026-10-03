// Base repository interface for common CRUD operations
export interface IRepository<T, CreateDto, UpdateDto> {
    findAll(): Promise<T[]>;
    findById(id: string): Promise<T>;
    create(data: CreateDto): Promise<T>;
    update(id: string, data: UpdateDto): Promise<T>;
    delete(id: string): Promise<void>;
}
