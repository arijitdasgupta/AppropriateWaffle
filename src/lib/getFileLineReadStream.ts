import { Observable } from 'rxjs';
import * as RxNode from 'rx-node';
import * as readline from 'readline';
import * as fs from 'fs';

export const getFileLineReadStream = (filename:string):Observable<any> => {
    const readStreamFs = readline.createInterface({
        input: fs.createReadStream(filename)
    });

    return RxNode.fromReadLineStream(readStreamFs);
}