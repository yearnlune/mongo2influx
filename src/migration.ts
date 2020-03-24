import * as influxdb from './influx-mapper';
import * as mongodb from './mongo-mapper';
import _ from 'lodash';
import {InfluxDB, IPoint} from "influx";
import {Model} from "mongoose";

const DEFAULT_BATCH_SIZE: number = 50;
let INSTANCE: Migration;

export class Migration {
    private _mongoModel: Model<any> | null;
    private _influxDb: InfluxDB;
    private documentCount: number;

    constructor() {
        this._mongoModel = mongodb.getModel();
        this._influxDb = influxdb.getConnection();
        this.documentCount = 0;
    }

    async init() {
        this._mongoModel = mongodb.getModel();
        this._influxDb = influxdb.getConnection();
    }

    async migrate(measurement: string, batchSize: number) {
        await this.init();
        await this.hasDatabaseOnInfluxDBIfNotExistCreate();
        await this.getDocumentCount();
        let iter = 0;
        while (1) {
            let documents = await this.getDocuments(measurement, iter++, batchSize);
            if (!documents)
                break;
            await this.insertPoints(documents, measurement, iter++, batchSize);
            if (iter > this.documentCount / batchSize) break;
        }
        return this.documentCount;
    }

    async hasDatabaseOnInfluxDBIfNotExistCreate() {
        this._influxDb.getDatabaseNames().then(names => {
            if (!_.includes(names, influxdb.getConfig().database)) {
                console.log("CREATE DATABASE", influxdb.getConfig().database);
                return this._influxDb.createDatabase(influxdb.getConfig().database);
            }
            console.log("FOUND DATABASE", influxdb.getConfig().database);
        })
    }

    async getDocumentCount() {
        if (this._mongoModel) {
            await this._mongoModel.estimatedDocumentCount((err, count) => {
                if (err) {
                    console.error('getDocumentCount error: ', err);
                } else {
                    console.log('TOTAL DOCUMENT COUNT:', count);
                    this.documentCount = count;
                }
            })
        }
    }

    async getDocuments(measurement: string, skip: number, limit: number) {
        let documents: any[] | null = null;
        if (this._mongoModel) {
            documents = await this._mongoModel.aggregate([{
                    $skip: skip
                }, {
                    $limit: limit
                }]
                , (err, documents) => {
                    if (err) {
                        console.error('FAIL!! FOUND AT MONGODB: ', (limit * (skip)), '~', (limit * (skip + 1)), err);
                    } else {
                        console.log('SUCCESS!! FOUND AT MONGODB: ', (limit * (skip)), '~', (limit * (skip + 1)));
                    }
                });
        } else {
            console.error("MONGO MODEL NOT FOUND");
        }
        return documents;
    }

    async insertPoints(documents: any, measurement: string, skip: number, limit: number) {
        return this._influxDb.writePoints(this.documents2Points(documents, measurement))
            .then(() => {
                console.log("SUCCESS!! INSERT: ", (limit * (skip)), '~', (limit * (skip + 1)));
            })
            .catch(err => {
                console.error('FAIL!! INSERT: ', (limit * (skip)), '~', (limit * (skip + 1)));
                process.exit(1);
            });
    }

    documents2Points(documents: any[], measurement: string): IPoint[] {
        let points: IPoint[] = [];

        documents.forEach((document) => {
            let tags = this.refine(document, {}, influxdb.getTag());
            let fields = this.refine(document, {}, influxdb.getField());
            let timestamp = new Date();

            const point: IPoint = {
                measurement: measurement,
                tags: tags,
                fields: fields,
                timestamp: timestamp
            };
            points.push(point);
        });

        return points;
    }

    refine(document: any, obj: any, entrySet?: string[]): any {
        let localEntrySet: string[] | undefined = entrySet;
        if (!localEntrySet) {
            localEntrySet = Object.keys(document);
        }

        localEntrySet.forEach(entry => {
            if (document.hasOwnProperty(entry)) {
                if (_.isArray(document[entry])) {
                    let list: any[] = [];
                    document[entry].forEach((element) => {
                        let iterObj = this.refine(element, {});
                        list.push(iterObj);
                    });
                    obj[entry] = list;
                } else if (typeof document[entry] === 'object') {
                    obj[entry] = this.refine(document[entry], {});
                } else {
                    obj[entry] = document[entry];
                }
            }
        });

        return obj;
    }

    async truncate() {
        return await this._influxDb.query('DELETE FROM ' + influxdb.getConfig().database + ' WHERE time < now();');
    }
}

export function init(): Migration {
    INSTANCE = new Migration();
    return INSTANCE;
}

export function migrate(measurement?: string, truncate: boolean = false, batchSize?: number) {
    if (typeof measurement === 'undefined') {
        measurement = 'defaults';
    }
    influxdb.setMeasurement(measurement);

    if (typeof batchSize === 'undefined') {
        batchSize = DEFAULT_BATCH_SIZE
    }

    if (truncate) {
        INSTANCE.truncate().then(() => {
            console.log("SUCCESS TRUNCATE", influxdb.getConfig().database);
        });
    }

    INSTANCE.migrate(measurement, batchSize).then((count) => {
        console.log("SUCCESS MIGRATION :", count);
    });
}

export function truncate() {
    INSTANCE.truncate();
}
