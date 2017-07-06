import * as fs from 'fs';
import * as Rx from 'rxjs';
import * as RxNode from 'rx-node';
import * as readline from 'readline';
import * as _ from 'lodash';
import * as stream from 'stream'

import { 
  IVectorFileSpecification, 
  vectorFileSpecifications, 
  outputDirectory, 
  operationalConfiguration, 
  IOutputRawData, 
  IOutKeyValPair,
  IFinalOutput } from './config';
import { getFileReadStream } from './lib/fileStream';
import { mapToObjectFromCsv } from './lib/mapToObjectFromCsv';

interface IReadStreamData {
    fileSpecification: IVectorFileSpecification;
}

const readStreamDataList:IVectorFileSpecification[] = vectorFileSpecifications;

class OutputWriteStream { 
    private outputFilename:string;
    private keyValueStream: Rx.Observable<IOutKeyValPair[]>;
    private fileWriteStream: stream.Writable;

    outputPushCallback: (any) => void;

    constructor(readStreamDataList:IVectorFileSpecification[]) {
        this.outputFilename = readStreamDataList.map(fileReadData => {
            const withoutDirectory = fileReadData.filename
              .split('/')[fileReadData.filename.split('/').length - 1];
            return withoutDirectory.split('.')[0];
        }).reduce((acc, name, index) => {
            return acc + (index?'-':'') + name;
        }, outputDirectory) + '.csv';

        console.log(`Writing to ${this.outputFilename}`);

        this.fileWriteStream = fs.createWriteStream(this.outputFilename);

        this.keyValueStream = Rx.Observable.create((observer) => {
            this.outputPushCallback = (data:IFinalOutput) => {
                observer.next(data);
            }
        })
        .map((data:IFinalOutput) => {
            const keyValue = _.map(data.accumulatedData, (value, key) => {
                return {value, key};
            });

            return _.concat(data.keyValueCalculated, keyValue) as IOutKeyValPair[];
        });

        const keys = this.keyValueStream.take(1);

        const rows = this.keyValueStream.skip(1);

        const outputStream = keys.concatMap((data) => {
            const listOfKeys = data.map(item => item.key);
            const listOfFirstValues = data.map(item => item.value);

            return Rx.Observable.of(listOfFirstValues).concatMap(_ => {
                return rows.map(data => {
                    //One line array coming
                    return listOfKeys.map(key => {
                        return data.filter(kvPair => kvPair.key === key)[0].value;
                    });
                });
            }).startWith(listOfKeys);
        })
        .map((stringCells:string[]) => {
            return stringCells.reduce((acc, item) => acc + (acc.length?',':'') + item, '');
        })
        .map((oneLine:string) => {
            return `${oneLine}\n`;
        });

        outputStream.subscribe((data) => {
            this.fileWriteStream.write(data);
        });
    }

    end = () => {
        this.fileWriteStream.end();
    }

    push = (data:IFinalOutput) => {
        this.outputPushCallback(data);
    }
}

const looper = (readStreamDataList:IVectorFileSpecification[], outputWriteStream) => {
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

const outputStream = new OutputWriteStream(readStreamDataList)
looper(readStreamDataList, outputStream);