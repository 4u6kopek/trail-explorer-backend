import { connectToDatabase } from "../../lib/connectToDatabase.js";
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
    origin: '*', // Replace with your frontend URL in production
    methods: ['GET, POST, PUT, DELETE, OPTIONS'],
});

// Helper to run middleware in Next.js/Vercel
function runMiddleware(req, res, fn) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) {
                return reject(result);
            }
            return resolve(result);
        });
    });
}

export default async function handler(req, res) {
    // Run CORS middleware
    await runMiddleware(req, res, cors);

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
