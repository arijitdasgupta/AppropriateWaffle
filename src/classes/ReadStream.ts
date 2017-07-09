import * as Rx from 'rxjs';

import { IVectorFileSpecification } from '../interfaces/IConfigInterfaces';
import { transformToObjectFromCsvLineStream } from '../lib/transformToObjectFromCsvLineStream';
import { getFileLineReadStream } from '../lib/getFileLineReadStream';

export class ReadStream {
    private dataReadStream: Rx.Observable<string>;
    private dataAccumulator: string[] = [];
    public loaded: Promise<boolean>;

    constructor(private fileSpec:IVectorFileSpecification) {
        if (this.fileSpec.inMemory) {
            this.loaded = new Promise((resolve, reject) => {
                let loadCompleteHook = () => {
                    resolve(true);
                };

                getFileLineReadStream(fileSpec.filename)
                    .subscribe(
                        (lineString) => this.dataAccumulator.push(lineString),
                        _ => {},
                        () => { loadCompleteHook(); }
                    );
            });
        } else {
            this.loaded = Promise.resolve(true);
        }
    }

    getStream = ():Rx.Observable<any> => {
        if (this.fileSpec.inMemory) {
            this.dataReadStream = Rx.Observable.from(this.dataAccumulator);
        } else {
            this.dataReadStream = getFileLineReadStream(this.fileSpec.filename);
        }

        return transformToObjectFromCsvLineStream(this.dataReadStream, this.fileSpec.propsToTake);
    }
}