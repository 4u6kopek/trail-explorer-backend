import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};
let cachedClient = null;
let cachedDb = null;

if (!uri) {
    throw new Error("Please add your Mongo URI to .env.local");
}

export async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { mongoClient: cachedClient, db: cachedDb };
    }

    try {
        const mongoClient = new MongoClient(uri, options);
        await mongoClient.connect();

        const db = mongoClient.db("trailExplorer");

        cachedClient = mongoClient;
        cachedDb = db;

        console.log("Just Connected!");
        return { mongoClient, db };
    } catch (e) {
        console.error("Error connecting to MongoDB:", e);
        throw new Error("Failed to connect to the database.");
    }
}
