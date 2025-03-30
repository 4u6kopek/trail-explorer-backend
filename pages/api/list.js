import { connectToDatabase } from "../../lib/connectToDatabase.js";

export default async function handler(request, response) {
    try {
        const { mongoClient } = await connectToDatabase();
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