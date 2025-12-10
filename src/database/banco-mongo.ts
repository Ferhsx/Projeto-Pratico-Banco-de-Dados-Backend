import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let dbInstance: Db;

export async function getDb() {
    if (!client) {
        // ... (Lógica de conexão)
        client = new MongoClient(process.env.MONGO_URI!);
        await client.connect();
        dbInstance = client.db(process.env.MONGO_DB!);
    }
    return { db: dbInstance, client };
}