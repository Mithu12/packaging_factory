export interface MediatorInterface{
    process(data:any): Promise<any>
}