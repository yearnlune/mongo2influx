import {DB_CONFIG} from "./config";
import {InfluxDB} from "influx";

let INSTANCE: InfluxMapper;

export class InfluxMapper {
    private _config: DB_CONFIG;
    private _connection: InfluxDB;
    private _tags: string[];
    private _fields: string[];
    private _measurement: string;

    constructor(config: DB_CONFIG) {
        this._config = config;
        this._connection = this.connect();
        this._tags = [];
        this._fields = [];
        this._measurement = "defaults";
    }

    get config(): DB_CONFIG {
        return this._config;
    }

    get connection(): InfluxDB {
        return this._connection;
    }

    get tags(): string[] {
        return this._tags;
    }

    set tags(value: string[]) {
        this._tags = value;
    }

    get fields(): string[] {
        return this._fields;
    }

    set fields(value: string[]) {
        this._fields = value;
    }

    get measurement(): string {
        return this._measurement;
    }

    set measurement(value: string) {
        this._measurement = value;
    }

    connect() {
        return new InfluxDB({
            hosts: [
                {host: this._config.host}
            ],
            username: this._config.user,
            password: this._config.password,
            database: this._config.database,
        });
    }
}

export function influxMapper(config: DB_CONFIG): InfluxMapper {
    INSTANCE = new InfluxMapper(config);
    return INSTANCE;
}

export function getConnection() {
    return INSTANCE.connection;
}

export function getConfig(): DB_CONFIG {
    return INSTANCE.config;
}

export function setTag(tag: string[]) {
    INSTANCE.tags = tag;
}

export function getTag() {
    return INSTANCE.tags;
}

export function setField(filed: string[]) {
    INSTANCE.fields = filed;
}

export function getField() {
    return INSTANCE.fields;
}

export function setMeasurement(measurement: string) {
    INSTANCE.measurement = measurement;
}

export function getMeasurement() {
    return INSTANCE.measurement;
}
