import {DB_CONFIG} from './config';
import mongoose, {Model, Mongoose, Schema, SchemaDefinition} from "mongoose";

let INSTANCE: MongoMapper;

export class MongoMapper {
    private _mongoose: Mongoose = mongoose;
    private _config: DB_CONFIG;
    private _connection: mongoose.Connection | null = null;
    private _schema: mongoose.Schema<any> | null = null;
    private _model: mongoose.Model<any> | null = null;

    constructor(config: DB_CONFIG) {
        this._config = config;
        this.connect();
        this._connection = this._mongoose.connection;
    }

    private makeUrl(): string {
        return 'mongodb://' + this._config.host + ":" + this._config.port + "/" + this._config.database;
    }

    private connect() {
        return this._mongoose.connect(
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

    setModel(collection: string, schema: Schema<any>) {
        this._schema = schema;
        this._model = this._mongoose.model(collection, schema);
    }

    get connection(): any {
        return this._connection;
    }

    get schema(): mongoose.Schema<any> | null {
        return this._schema;
    }

    get model(): mongoose.Model<any> | null {
        return this._model;
    }
}

export function mongoMapper(config: DB_CONFIG): MongoMapper {
    INSTANCE = new MongoMapper(config);
    return INSTANCE;
}

export function getConnection(): mongoose.Mongoose {
    return INSTANCE.connection;
}

export function setModel(schema: SchemaDefinition, collection: string) {
    INSTANCE.setModel(collection, new mongoose.Schema(schema));
    // return INSTANCE.connection.schema( new mongoose.Schema(schema));
}

export function getModel(): mongoose.Model<any> | null {
    return INSTANCE.model;
}

export function getSchema(): mongoose.Schema<any> | null {
    return INSTANCE.schema;
}
