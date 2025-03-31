import { connectToDatabase } from "../../lib/connectToDatabase.js";
import Cors from 'cors';
import { ObjectId } from 'mongodb';

const cors = Cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

async function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { db } = await connectToDatabase();
  const collection = db.collection("trails");

  try {
    // GET all trails
    if (req.method === 'GET' && !req.query.id) {
      const trails = await collection.find({}, {
        projection: {
          name: 1,
          briefDescription: 1,
          location: 1,
          difficulty: 1,
          length: 1,
          duration: 1,
          likes: 1,
          imageUrl: 1,
          createdAt: 1,
          userId: 1
        }
      }).toArray();
      return res.status(200).json(trails);
    }

    // GET single trail
    if (req.method === 'GET' && req.query.id) {
      const trail = await collection.findOne({
        _id: new ObjectId(req.query.id)
      });
      if (!trail) return res.status(404).json({ error: "Trail not found" });
      return res.status(200).json(trail);
    }

    // POST new trail
    if (req.method === 'POST') {
      const { name, fullDescription, location, difficulty, length, duration, userId, imageUrl } = req.body;

      if (!name || !fullDescription || !location || !difficulty || !length || !duration || !userId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const validDifficulties = ['easy', 'moderate', 'hard'];
      if (!validDifficulties.includes(difficulty)) {
        return res.status(400).json({ error: "Invalid difficulty level" });
      }

      if (imageUrl && !imageUrl.startsWith('http')) {
        return res.status(400).json({ error: "Invalid image URL" });
      }

      const newTrail = {
        name,
        fullDescription,
        briefDescription: fullDescription.length > 100
          ? `${fullDescription.substring(0, 100)}...`
          : fullDescription,
        location,
        difficulty,
        length: parseFloat(length),
        duration: parseFloat(duration),
        likes: 0,
        imageUrl: imageUrl || "/images/img-1.jpg",
        userId,
        createdAt: new Date()
      };

      const result = await collection.insertOne(newTrail);
      return res.status(201).json({ ...newTrail, _id: result.insertedId });
    }

    // PUT update trail
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { name, fullDescription, location, difficulty, length, duration, userId, imageUrl } = req.body;

      const trail = await collection.findOne({ _id: new ObjectId(id) });
      if (!trail) return res.status(404).json({ error: "Trail not found" });
      if (trail.userId !== userId) return res.status(403).json({ error: "Unauthorized" });

      if (imageUrl && !imageUrl.startsWith('http')) {
        return res.status(400).json({ error: "Invalid image URL" });
      }

      const updatedTrail = {
        ...trail,
        name: name || trail.name,
        fullDescription: fullDescription || trail.fullDescription,
        briefDescription: fullDescription
          ? (fullDescription.length > 100
            ? `${fullDescription.substring(0, 100)}...`
            : fullDescription)
          : trail.briefDescription,
        location: location || trail.location,
        difficulty: difficulty || trail.difficulty,
        length: length ? parseFloat(length) : trail.length,
        duration: duration ? parseFloat(duration) : trail.duration,
        imageUrl: imageUrl || trail.imageUrl
      };

      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedTrail }
      );
      return res.status(200).json(updatedTrail);
    }

    // DELETE trail
    if (req.method === 'DELETE') {
      const { id, userId } = req.query;
      const trail = await collection.findOne({ _id: new ObjectId(id) });
      if (!trail) return res.status(404).json({ error: "Trail not found" });
      if (trail.userId !== userId) return res.status(403).json({ error: "Unauthorized" });

      await collection.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ message: "Trail deleted" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Error:", e);
    return res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? e.message : undefined
    });
  }
}
