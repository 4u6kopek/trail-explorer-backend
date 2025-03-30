import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

if (!process.env.MONGODB_URI) {
    throw new Error("Please add your Mongo URI to .env.local");
}

export default async function handler(request, response) {
    try {
        const mongoClient = await (new MongoClient(uri, options)).connect();
        console.log("Just Connected!");
        const db = mongoClient.db("trailExplorer");
        const collection = db.collection("trails");
        const results = await collection.find({}).project({
            name: 1,
            description: 1,
            likes: 1,
        }).toArray();

        response.status(200).json(results);
    } catch (e) {
        console.log(e);
        response.status(500).json(e);
    }
}