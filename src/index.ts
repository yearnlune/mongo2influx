import * as influxdb from './influx-mapper';
import * as mongodb from './mongo-mapper';
import * as migration from './migration';
import {Types} from 'mongoose';
import * as mongoose from "mongoose";

mongodb.mongoMapper({
    host: process.env.MONGO_DB_HOST || "127.0.0.1",
    port: parseInt(process.env.MONGO_DB_PORT || "27017"),
    database: process.env.MONGO_DB_DATABASE || "database",
    user: process.env.MONGO_DB_USER || "root",
    password: process.env.MONGO_DB_PASSWORD || ""
});

influxdb.influxMapper({
    host: process.env.INFLUX_DB_HOST || "127.0.0.1",
    port: parseInt(process.env.INFLUX_DB_PORT || "8086"),
    database: process.env.INFLUX_DB_DATABASE || "database",
    user: process.env.INFLUX_DB_USER || "root",
    password:  process.env.INFLUX_DB_PASSWORD || ""
});

const mongo = mongodb.getConnection();
const influx = influxdb.getConnection();

