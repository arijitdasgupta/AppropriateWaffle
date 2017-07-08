import * as fs from 'fs';
import * as Rx from 'rxjs';
import * as stream from 'stream';
import * as _ from 'lodash';

import {
    IVectorFileSpecification, IOutputRawData, IOutKeyValPair, IFinalOutput
} from '../interfaces/IConfigInterfaces';

export class OutputWriteStream { 
    private outputFilename:string;
    private keyValueStream: Rx.Observable<IOutKeyValPair[]>;
    private fileWriteStream: stream.Writable;

    public outputPushCallback: (any) => void;

    constructor(readStreamDataList:IVectorFileSpecification[], outputDirectory: string) {
        // the output filename is only UNIX compatible, won't work on Windows
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
            };
        })
        .map((data:IFinalOutput) => {
            const keyValue = _.map(data.accumulatedData, (value, key) => {
                return {value, key};
            });

            return _.concat(data.keyValueCalculated, keyValue) as IOutKeyValPair[];
        });

        const keys = this.keyValueStream.take(1);

        const rows = this.keyValueStream.skip(1);

        // Takes the first object as headers... and makes sure things are 
        // properly sequenced for the next ones
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