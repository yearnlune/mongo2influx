import {DB_CONFIG} from './config';
import mongoose from "mongoose";

let INSTANCE: MongoMapper;

export class MongoMapper {
    private config: DB_CONFIG;
    private _connection: mongoose.Connection | null = null;

    constructor(config: DB_CONFIG) {
        this.config = config;
        this.connect();
        this._connection = mongoose.connection;
    }

    private makeUrl(): string {
        return 'mongodb://' + this.config.host + ":" + this.config.port;
    }

    private connect() {
        return mongoose.connect(
            this.makeUrl(),
            {
                useNewUrlParser: true,
                useUnifiedTopology: true
            }).then(() => {
            console.log(this.makeUrl(), "CONNECTED");
        }).catch(() => {
            console.error(this.makeUrl(), "NOT CONNECTED");
        });
    }

    get connection(): any {
        return this._connection;
    }
}

export function mongoMapper(config: DB_CONFIG): MongoMapper {
    INSTANCE = new MongoMapper(config);
    return INSTANCE;
}

export function getConnection(): mongoose.Mongoose {
    return INSTANCE.connection;
}
