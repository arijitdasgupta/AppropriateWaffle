export interface IVectorFileSpecification {
    filename: string;
    propsToTake: string[];
}

export interface IOutputSpecification {
    key: string;
    value: any;
}

export interface IOutputRawData {
    accumulatedData: any;
    operationOutput: any;
}

export interface IFinalOutput {
    accumulatedData: any;
    keyValueCalculated: IOutKeyValPair;
}

export interface IOutKeyValPair {
    key: string;
    value: string;
}

export type TOperationCallback = (data:any) => void;

export type TOperation = (object:any, callback:TOperationCallback) => void;

export type TFilter = (data:any) => boolean;

export type TOutput = (data:IOutputRawData) => IOutKeyValPair[];

export interface IOperationConfiguration {
    calculationMap: TOperation;
    filter: TFilter;
    outputMap: TOutput;
}

export const vectorFileSpecifications:IVectorFileSpecification[] = [
    {
        filename: './data/zip_bg_lat_lon.csv',
        propsToTake: [
            'zip4',
            'Lon1',
            'Lat1',
            'blkgrp'
        ]
    },
    {
        filename: './data/SF_NPL_new.csv',
        propsToTake: [
            'SiteID',
            'EPAID',
            'Zip',
            'NPL_date',
            'NPL_year',
            'Latitude',
            'Longitude'
        ]
    }
];

export const operationalConfiguration:IOperationConfiguration = {
    calculationMap: (object:any, callback:TOperationCallback) => {
        const { Lon1, Lat1, Latitude, Longitude } = object;

        // Haversine geo spatial distance formulae...
        const R = 3959; //Radius in kilometers

        const toRad = function(number) {
            return number * Math.PI / 180;
        }

        const lat1 = parseFloat(Lat1);
        const lon1 = parseFloat(Lon1);
        const lat2 = parseFloat(Latitude);
        const lon2 = parseFloat(Longitude);

        const phiLat1 = toRad(lat1);
        const phiLat2 = toRad(lat2);
        const phiLon1 = toRad(lon1);
        const phiLon2 = toRad(lon2);

        const deltaLat = Math.abs(phiLat1 - phiLat2);
        const deltaLon = Math.abs(phiLon1 - phiLon2);

        const A = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) 
            + (Math.cos(phiLat1) * Math.cos(phiLat2) 
            * Math.sin(deltaLon/2) * Math.sin(deltaLon/2));  

        const c = 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));

        const distance = R * c;

        let zone = 0;

        if (distance < 3) {
            zone = 1;
        } else if (distance >= 3 && distance <= 6){
            zone = 2;
        }

        // This where the calculation will go
        callback({distance, zone});
    },
    filter: (data) => {
        // return !!data.zone;
        return true;
    },
    outputMap: (data) => {
        return [{
            key: 'Distance (Miles)',
            value: data.operationOutput.distance
        },
        {
            key: 'Zone',
            value: data.operationOutput.zone
        }];
    }
};

export const outputDirectory = './data/';