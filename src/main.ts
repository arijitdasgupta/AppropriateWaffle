import * as Rx from 'rxjs';
import * as _ from 'lodash';

import { 
    vectorFileSpecifications, 
    outputDirectory, 
    operationalConfiguration 
} from '../config';

import {
    IVectorFileSpecification, 
    IOutputRawData, 
    IOutKeyValPair, 
    IFinalOutput,
    IReadStreamData,
    IOperationConfiguration
} from './interfaces/IConfigInterfaces';

import { transformToObjectFromCsvLineStream } from './lib/transformToObjectFromCsvLineStream';
import { OutputWriteStreamWrapper } from './classes/OutputWriteStreamWrapper';
import { MainLoop } from './classes/MainLoop';
import { ReadStream } from './classes/ReadStream';

const readStreams = _.map(vectorFileSpecifications, fileSpec => new ReadStream(fileSpec));
const loadedReadStreams = _.map(readStreams, stream => stream.loaded);

Promise.all(loadedReadStreams).then(_ => {
    const outputStream = new OutputWriteStreamWrapper(vectorFileSpecifications, outputDirectory);
    const mainLoop = new MainLoop(readStreams, operationalConfiguration, outputStream);

    // The start
    mainLoop.start();
});
