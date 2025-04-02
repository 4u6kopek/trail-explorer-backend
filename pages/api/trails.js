import { connectToDatabase } from "../../lib/connectToDatabase.js";
import Cors from 'cors';
import { ObjectId } from 'mongodb';

const cors = Cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
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

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { db } = await connectToDatabase();
  const collection = db.collection("trails");
  const usersCollection = db.collection("users");

  try {
    // GET all trails
    if (req.method === 'GET' && !req.query.id && !req.query.userId && !req.query.savedBy) {
      const trails = await collection.find({}, {
        projection: {
          name: 1,
          description: 1,
          location: 1,
          difficulty: 1,
          length: 1,
          duration: 1,
          likes: 1,
          imageUrl: 1,
          createdAt: 1,
          userId: 1,
          savedBy: 1
        }
      }).toArray();
      return res.status(200).json(trails);
    }

    // GET trails by user ID
    if (req.method === 'GET' && req.query.userId) {
      const trails = await collection.find({ userId: req.query.userId }).toArray();
      return res.status(200).json(trails);
    }

    // GET trails saved by user
    if (req.method === 'GET' && req.query.savedBy) {
      const trails = await collection.find({ savedBy: req.query.savedBy }).toArray();
      return res.status(200).json(trails);
    }

    // GET single trail
    if (req.method === 'GET' && req.query.id) {
      const trail = await collection.findOne({ _id: new ObjectId(req.query.id) });
      if (!trail) return res.status(404).json({ error: "Trail not found" });
      return res.status(200).json(trail);
    }

    // POST new trail
    if (req.method === 'POST') {
      const { name, description, location, difficulty, length, duration, userId, imageUrl } = req.body;

      if (!name || !description || !location || !difficulty || !length || !duration || !userId) {
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
        description,
        location,
        difficulty,
        length: parseFloat(length),
        duration: parseFloat(duration),
        likes: 0,
        imageUrl: imageUrl || "/images/img-1.jpg",
        userId,
        savedBy: [],
        createdAt: new Date()
      };

      const result = await collection.insertOne(newTrail);

      // Update user's trails count
      await usersCollection.updateOne(
        { _id: userId },
        { $inc: { trailsCount: 1 } },
        { upsert: true }
      );

      return res.status(201).json({ ...newTrail, _id: result.insertedId });
    }

    // PUT update trail
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { name, description, location, difficulty, length, duration, userId, imageUrl } = req.body;

      const trail = await collection.findOne({ _id: new ObjectId(id) });
      if (!trail) return res.status(404).json({ error: "Trail not found" });
      if (trail.userId !== userId) return res.status(403).json({ error: "Unauthorized" });

      const updatedTrail = {
        ...trail,
        name: name || trail.name,
        description: description || trail.description,
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

    // PATCH save/unsave trail
    if (req.method === 'PATCH' && req.query.action === 'save') {
      const { trailId, userId } = req.body;

      if (!trailId || !userId) {
        return res.status(400).json({ error: "Missing trailId or userId" });
      }

      const trail = await collection.findOne({ _id: new ObjectId(trailId) });
      if (!trail) return res.status(404).json({ error: "Trail not found" });

      const isSaved = trail.savedBy?.includes(userId);
      const updateOperation = isSaved
        ? {
          $pull: { savedBy: userId },
          $inc: { likes: -1 }
        }
        : {
          $push: { savedBy: userId },
          $inc: { likes: 1 }
        };

      await collection.updateOne(
        { _id: new ObjectId(trailId) },
        updateOperation
      );

      // Update user's saved trails
      await usersCollection.updateOne(
        { _id: userId },
        isSaved
          ? { $pull: { savedTrails: trailId } }
          : { $push: { savedTrails: trailId } },
        { upsert: true }
      );

      const updatedTrail = await collection.findOne({ _id: new ObjectId(trailId) });

      return res.status(200).json({
        message: isSaved ? "Trail unsaved" : "Trail saved",
        isSaved: !isSaved,
        likes: updatedTrail.likes
      });
    }

    // DELETE trail
    if (req.method === 'DELETE') {
      const { id, userId } = req.query;
      const trail = await collection.findOne({ _id: new ObjectId(id) });
      if (!trail) return res.status(404).json({ error: "Trail not found" });
      if (trail.userId !== userId) return res.status(403).json({ error: "Unauthorized" });

      await collection.deleteOne({ _id: new ObjectId(id) });

      // Update user's trails count
      await usersCollection.updateOne(
        { _id: userId },
        { $inc: { trailsCount: -1 } }
      );

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
