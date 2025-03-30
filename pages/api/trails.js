import { connectToDatabase } from "../../lib/connectToDatabase.js";

export default async function handler(req, res) {
    try {
        const { db } = await connectToDatabase();
        const collection = db.collection("trails");

        const results = await collection.find({}).project({
            name: 1,
            description: 1,
            likes: 1,
        }).toArray();

        res.status(200).json(results);
    } catch (e) {
        console.error("Error fetching trails:", e);
        res.status(500).json({ error: "Failed to fetch trails" });
    }
}
