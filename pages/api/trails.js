import { connectToDatabase } from "../../lib/connectToDatabase.js";
import Cors from 'cors';
import { ObjectId } from 'mongodb'

// Initialize CORS middleware
const cors = Cors({
  origin: '*', // Replace with your frontend URL in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Helper to run middleware
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

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { db } = await connectToDatabase();
  const collection = db.collection("trails");

  try {
    // GET all trails
    if (req.method === 'GET') {
      const trails = await collection.find({}).toArray();
      return res.status(200).json(trails);
    }

    // POST new trail
    if (req.method === 'POST') {
      const { name, description, userId } = req.body;
      
      if (!name || !description || !userId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const newTrail = {
        name,
        description,
        image: req.body.image || "/img-1.jpg",
        likes: 0,
        userId,
        createdAt: new Date()
      };

      const result = await collection.insertOne(newTrail);
      return res.status(201).json({ ...newTrail, _id: result.insertedId });
    }

    // PUT update trail
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { name, description, userId } = req.body;

      const trail = await collection.findOne({ _id: new ObjectId(id) });
      
      if (!trail) {
        return res.status(404).json({ error: "Trail not found" });
      }

      if (trail.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to edit this trail" });
      }

      const updatedTrail = {
        ...trail,
        name: name || trail.name,
        description: description || trail.description,
        image: req.body.image || trail.image
      };

      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedTrail }
      );

      return res.status(200).json(updatedTrail);
    }

    // DELETE trail
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const { userId } = req.body;

      const trail = await collection.findOne({ _id: new ObjectId(id) });
      
      if (!trail) {
        return res.status(404).json({ error: "Trail not found" });
      }

      if (trail.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this trail" });
      }

      await collection.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ message: "Trail deleted successfully" });
    }

    // Method not allowed
    return res.status(405).json({ error: "Method not allowed" });

  } catch (e) {
    console.error("Error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
