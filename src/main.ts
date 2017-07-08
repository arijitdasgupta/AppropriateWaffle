import * as fs from 'fs';
import * as Rx from 'rxjs';
import * as _ from 'lodash';
import * as stream from 'stream'

import { 
    vectorFileSpecifications, 
    outputDirectory, 
    operationalConfiguration 
} from './config';

import {
    IVectorFileSpecification, 
    IOutputRawData, 
    IOutKeyValPair, 
    IFinalOutput,
    IReadStreamData
} from './interfaces/IConfigInterfaces';

import { getFileReadStream } from './lib/fileStream';
import { mapToObjectFromCsv } from './lib/mapToObjectFromCsv';
import { OutputWriteStream } from './lib/OutputWriteStream';

const readStreamDataList:IVectorFileSpecification[] = vectorFileSpecifications;

const mainLoopInitiator = (readStreamDataList:IVectorFileSpecification[], outputWriteStream:OutputWriteStream) => {
    let outputResolver;

    const outputStream = Rx.Observable.create((observer) => {
        outputResolver = (data) => {
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
        outputWriteStream.push(data);
    });

    const recursiveLooper = (readStreamDataList:IVectorFileSpecification[], dataAccumulator, outputWriteStream) => {
        if (readStreamDataList.length > 0) {
            const fileData:IVectorFileSpecification = _.first(readStreamDataList);
            const restOfFileData:IVectorFileSpecification[] = _.slice(readStreamDataList, 1);
            const readStream = getFileReadStream(fileData.filename);
            mapToObjectFromCsv(readStream, fileData.propsToTake).subscribe(data => {
                recursiveLooper(restOfFileData, _.extend({}, dataAccumulator, data), outputWriteStream);
            });
        } else {
            operationalConfiguration.calculationMap(dataAccumulator, (data) => {
                outputResolver({
                    accumulatedData: dataAccumulator,
                    operationOutput: data
                });
            });
        }
    }

    recursiveLooper(readStreamDataList, {}, outputWriteStream);
}

const outputStream = new OutputWriteStream(readStreamDataList, outputDirectory);
mainLoopInitiator(readStreamDataList, outputStream);