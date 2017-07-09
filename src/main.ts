import * as _ from 'lodash';
import * as commandLineArgs from 'command-line-args';
import * as commandLineUsage from 'command-line-usage';

import * as fs from 'fs';

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
import { Config } from './classes/Config';

// Command line option definitions
const optionDefinitions = [
    { name: 'job', alias: 'j', type: String , description: 'The job name from the configuration file'},
    { name: 'help', alias: 'h', type: Boolean , description: 'Print this help document'}
];

const commandLineHelpSections = [
    {
        header: 'A typical app',
        content: 'Generates something [italic]{very} important.'
    },
    {
        header: 'CLI options',
        optionList: optionDefinitions
    }
];

// TODO Better paths and config loading
const conigurationString = fs.readFileSync('./config.json').toString();
const configurationObject = JSON.parse(conigurationString);

// Command line options parsing...
const commandLineOptions = commandLineArgs(optionDefinitions);

// Printing the help...
if (commandLineOptions.help) {
    console.log(commandLineUsage(commandLineHelpSections));
    process.exit(0);
}

// The job from the configuration
const jobName = commandLineOptions.job;

// Getting configurations and readStreams...
const config = new Config(_.get(configurationObject, jobName));
const readStreams = _.map(config.vectorFileSpecifications, fileSpec => new ReadStream(fileSpec));
const loadedReadStreams = _.map(readStreams, stream => stream.loaded);

Promise.all(loadedReadStreams).then(_ => {
    const outputStream = new OutputWriteStreamWrapper(
      config.vectorFileSpecifications, config.outputDirectory);
    const mainLoop = new MainLoop(readStreams, 
      config.operationalConfiguration, outputStream);

    // The start
    mainLoop.start().then(_ => {
        console.log('Processing complete, yaay!');
        outputStream.end();
        process.exit(0);
    });
});
