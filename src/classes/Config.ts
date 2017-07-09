import {
    IVectorFileSpecification,
    IOperationConfiguration,
    TFilter,
    TOperation,
    TOutput
} from '../interfaces/IConfigInterfaces';

interface IConfigurationObjectFromJSON {
    vectorFileSpecifications: IVectorFileSpecification[];
    operationConfiguration: {
        calculationMap: string;
        filter: string;
        outputMap: string;
    }
    outputDirectory: string;
}

export class Config {
    vectorFileSpecifications: IVectorFileSpecification[];
    operationalConfiguration: IOperationConfiguration;
    outputDirectory: string;

    constructor(configurationObject:IConfigurationObjectFromJSON) {
        this.vectorFileSpecifications = configurationObject.vectorFileSpecifications;
        this.outputDirectory = configurationObject.outputDirectory;

        this.operationalConfiguration = {
            calculationMap: (new Function(
                'object', // The raw CSV object merged
                'callback', // Call on each operation after done
                configurationObject.operationConfiguration.calculationMap)).bind(this) as TOperation,
            filter: (new Function('data', // Callback arg object from the calculationMap
                configurationObject.operationConfiguration.filter)).bind(this) as TFilter,
            outputMap: (new Function('data', //IOutputRawData
                configurationObject.operationConfiguration.outputMap)).bind(this) as TOutput
        }
    }
}