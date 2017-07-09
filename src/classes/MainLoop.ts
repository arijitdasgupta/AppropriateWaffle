import * as _ from 'lodash';
import * as Rx from 'rxjs';

import {
    IVectorFileSpecification, 
    IOutputRawData,
    IOutKeyValPair,
    IFinalOutput,
    IReadStreamData,
    IOperationConfiguration
} from '../interfaces/IConfigInterfaces';
import { OutputWriteStreamWrapper } from './OutputWriteStreamWrapper';
import { ReadStream } from './ReadStream';
import { transformToObjectFromCsvLineStream } from '../lib/transformToObjectFromCsvLineStream';

export class MainLoop {
    private outputResolver: (any) => void;

    constructor(
        private readStreams:ReadStream[],
        private operationalConfiguration:IOperationConfiguration,
        private opWriteStreamWrapper:OutputWriteStreamWrapper) {

        const outputStream = Rx.Observable.create((observer) => {
            this.outputResolver = (data) => {
                observer.next(data as IOutputRawData);
            }
        }).filter((data:IOutputRawData) => {
            return operationalConfiguration.filter(data.operationOutput);
        }).map((data:IOutputRawData) => {
            return {
                keyValueCalculated: operationalConfiguration.outputMap(data),
                accumulatedData: data.accumulatedData
            };
        });

        outputStream.subscribe((data:IFinalOutput) => {
            opWriteStreamWrapper.push(data);
        });
    }

    private recursiveLooper = (dataAccumulator: any, readStreams:ReadStream[]) => {
        if (readStreams.length > 0) {
            const rdStream:ReadStream = _.first(readStreams);
            const restOfReadStreams:ReadStream[] = _.slice(readStreams, 1);
            rdStream.getStream().subscribe(data => {
                this.recursiveLooper(_.extend({}, dataAccumulator, data), restOfReadStreams);
            });
        } else {
            this.operationalConfiguration.calculationMap(dataAccumulator, (data) => {
                this.outputResolver({
                    accumulatedData: dataAccumulator,
                    operationOutput: data
                });
            });
        }
    }

    start = () => {
        this.recursiveLooper({}, this.readStreams);
    }
}