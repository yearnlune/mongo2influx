import * as influxdb from './influx-mapper';
import * as mongodb from './mongo-mapper';
import _ from 'lodash';
import {InfluxDB, IPoint} from "influx";
import {Model} from "mongoose";

const DEFAULT_BATCH_SIZE: number = 20;
let INSTANCE: Migration;

export class Migration {
    private _mongoModel: Model<any> | null;
    private _influxDb: InfluxDB;
    private _batchSize: number;
    private documentCount: number;

    constructor() {
        this._mongoModel = mongodb.getModel();
        this._influxDb = influxdb.getConnection();
        this._batchSize = DEFAULT_BATCH_SIZE;
        this.documentCount = 0;
    }

    async init() {
        this._mongoModel = mongodb.getModel();
        this._influxDb = influxdb.getConnection();
    }

    async migrate(batchSize: number) {
        await this.init();
        await this.hasDatabaseOnInfluxDBIfNotExistCreate();
        await this.getDocumentCount();
        let iter = 0;
        while (1) {
            await this.getDocuments(iter++, batchSize);
            if (iter > this.documentCount / batchSize) break;
        }
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

    async getDocuments(skip: number, limit: number) {
        if (this._mongoModel) {
            let documents = await this._mongoModel.aggregate([{
                    $skip: skip
                }, {
                    $limit: limit
                }]
                , (err, documents) => {
                    if (err) {
                        console.error('getDocuments error: ', (limit * (skip)), '~', (limit * (skip + 1)), err);
                    } else {
                        console.log("SUCCESS FOUND: ", (limit * (skip)), '~', (limit * (skip + 1)));
                    }
                });

            if (documents) {
                this._influxDb.writePoints(this.documents2Points(documents))
                    .then(() => {
                        console.log("SUCCESS INSERT: ", (limit * (skip)), '~', (limit * (skip + 1)));
                    })
                    .catch(err => {
                        console.error('writePoints error');
                    });
            }
        } else {
            console.error("MONGO MODEL NOT FOUND");
        }
    }

    documents2Points(documents: any[]): IPoint[] {
        let points: IPoint[] = [];
        documents.forEach((document) => {
            const point: IPoint = {
                measurement: 'processes',
                tags: this.refine(document, influxdb.getTag()),
                fields: this.refine(document, influxdb.getField()),
                timestamp: new Date()
            };
            points.push(point);
        });

        return points;
    }

    refine(document: any, entrySet: string[]): any {
        let obj: any = {};
        entrySet.forEach(entry => {
            if (document.hasOwnProperty(entry)) {
                obj[entry] = document[entry];
                if (typeof document[entry] === 'object') {
                    obj[entry] = JSON.parse(JSON.stringify(document[entry]));
                }
            }
        });

        return obj;
    }
}

export function init(): Migration {
    INSTANCE = new Migration();
    return INSTANCE;
}

export function migrate(batchSize?: number) {
    if (typeof batchSize === 'undefined') {
        batchSize = DEFAULT_BATCH_SIZE
    }
    INSTANCE.migrate(batchSize);
}
