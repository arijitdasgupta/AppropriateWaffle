export interface IVectorFileSpecification {
    filename: string;
    propsToTake: string[];
}

export interface IOutputSpecification {
    key: string;
    value: any;
}

export interface IOutputRawData {
    accumulatedData: any;
    operationOutput: any;
}

export interface IFinalOutput {
    accumulatedData: any;
    keyValueCalculated: IOutKeyValPair;
}

export interface IOutKeyValPair {
    key: string;
    value: string;
}

export interface IReadStreamData {
    fileSpecification: IVectorFileSpecification;
}

export type TOperationCallback = (data:any) => void;

export type TOperation = (object:any, callback:TOperationCallback) => void;

export type TFilter = (data:any) => boolean;

export type TOutput = (data:IOutputRawData) => IOutKeyValPair[];

export interface IOperationConfiguration {
    calculationMap: TOperation;
    filter: TFilter;
    outputMap: TOutput;
}