import {DB_CONFIG} from "./config";
import {InfluxDB} from "influx";

let INSTANCE: InfluxMapper;

export class InfluxMapper {
    private config: DB_CONFIG;
    private _connection: InfluxDB;

    constructor(config: DB_CONFIG) {
        this.config = config;
        this._connection = this.connect();
    }

    connect() {
        return new InfluxDB({
            hosts: [
                {host: this.config.host}
            ],
            username: this.config.user,
            password: this.config.password,
            database: this.config.database,
        });
    }

    get connection(): InfluxDB {
        return this._connection;
    }
}

export function influxMapper(config: DB_CONFIG): InfluxMapper {
    INSTANCE = new InfluxMapper(config);
    return INSTANCE;
}

export function getConnection() {
    return INSTANCE.connection;
}
