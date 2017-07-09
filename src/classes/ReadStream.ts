import * as Rx from 'rxjs';

import { IVectorFileSpecification } from '../interfaces/IConfigInterfaces';
import { transformToObjectFromCsvLineStream } from '../lib/transformToObjectFromCsvLineStream';
import { getFileLineReadStream } from '../lib/getFileLineReadStream';

export class ReadStream {
    private dataReadStream: Rx.Observable<string>;
    private dataReadCompleteHook = () => {};
    private dataReadCompleteFlag: boolean = false;
    private dataAccumulator: string[] = [];

    constructor(private fileSpec:IVectorFileSpecification) {}

    getStream = ():Rx.Observable<any> => {
        if (!this.fileSpec.inMemory) {
            this.dataReadStream = getFileLineReadStream(this.fileSpec.filename);
        } else {
            console.log(this.dataReadCompleteFlag);
            // If it already ran
            if (this.dataReadCompleteFlag) {
                return transformToObjectFromCsvLineStream(
                    Rx.Observable.from(this.dataAccumulator),
                    this.fileSpec.propsToTake);
            } else { // If it didn't run
                this.dataReadStream = Rx.Observable.create((observer) => {
                    this.dataReadCompleteHook = () => {
                        observer.next(this.dataAccumulator);
                    }
                }).switchMap(data => {
                    return Rx.Observable.from(data);
                });

                const fileReadStream = getFileLineReadStream(this.fileSpec.filename);
            
                fileReadStream.subscribe(
                    (d) => this.dataAccumulator.push(d),
                    _ => {},
                    () => { 
                        this.dataReadCompleteFlag = true;
                        this.dataReadCompleteHook() 
                    });
            }
        }

        return transformToObjectFromCsvLineStream(
                this.dataReadStream,
                this.fileSpec.propsToTake);
    }
}