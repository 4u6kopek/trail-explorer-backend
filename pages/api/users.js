import { connectToDatabase } from "../../lib/connectToDatabase.js";
import Cors from 'cors';
import { ObjectId } from 'mongodb';

const cors = Cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
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
    const usersCollection = db.collection("users");
    const trailsCollection = db.collection("trails");

    try {
        // POST - Create new user (for registration)
        if (req.method === 'POST') {
            const { _id, username, email } = req.body;

            // Validate required fields
            if (!_id || !username || !email) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            // Check for existing user
            const existingUser = await usersCollection.findOne({
                $or: [
                    { _id },
                    { email },
                    { username }
                ]
            });

            if (existingUser) {
                return res.status(409).json({
                    error: existingUser._id === _id
                        ? "User already exists"
                        : existingUser.email === email
                            ? "Email already in use"
                            : "Username taken"
                });
            }

            // Create new user document
            const newUser = {
                _id,
                username,
                email,
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
                trailsCount: 0,
                savedTrails: [],
                createdAt: new Date()
            };

            const result = await usersCollection.insertOne(newUser);
            return res.status(201).json({
                ...newUser,
                _id: result.insertedId
            });
        }

        // GET user profile (with populated saved trails)
        if (req.method === 'GET' && req.query.id) {
            const userId = req.query.id;

            // Get user document
            const user = await usersCollection.findOne({ _id: userId });
            if (!user) return res.status(404).json({ error: "User not found" });

            // Convert savedTrails IDs to ObjectId
            const savedTrailIds = user.savedTrails?.map(id => new ObjectId(id)) || [];

            // Get full details of both created and saved trails
            const [createdTrails, savedTrails] = await Promise.all([
                trailsCollection.find(
                    { userId: userId },
                    {
                        projection: {
                            name: 1,
                            description: 1,
                            location: 1,
                            difficulty: 1,
                            length: 1,
                            duration: 1,
                            likes: 1,
                            imageUrl: 1,
                            userId: 1,
                            createdAt: 1
                        }
                    }
                ).toArray(),

                savedTrailIds.length > 0
                    ? trailsCollection.find(
                        { _id: { $in: savedTrailIds } },
                        {
                            projection: {
                                name: 1,
                                description: 1,
                                location: 1,
                                difficulty: 1,
                                length: 1,
                                duration: 1,
                                likes: 1,
                                imageUrl: 1,
                                userId: 1,
                                createdAt: 1
                            }
                        }
                    ).toArray()
                    : []
            ]);

            return res.status(200).json({
                ...user,
                createdTrails,
                savedTrails
            });
        }

        // GET leaderboard (top 10 users by trailsCount)
        if (req.method === 'GET' && req.query.leaderboard) {
            const leaderboard = await usersCollection.aggregate([
                { $match: { trailsCount: { $gt: 0 } } },
                { $sort: { trailsCount: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        username: 1,
                        avatarUrl: 1,
                        trailsCount: 1,
                        createdAt: 1
                    }
                }
            ]).toArray();

            return res.status(200).json(leaderboard);
        }

        // PATCH update user profile
        if (req.method === 'PATCH') {
            const { id, username, avatarUrl } = req.body;

            if (!id) {
                return res.status(400).json({ error: "User ID is required" });
            }

            // Validate username
            if (username && username.length < 3) {
                return res.status(400).json({ error: "Username must be at least 3 characters" });
            }

            // Validate avatar URL
            if (avatarUrl && !avatarUrl.startsWith('http')) {
                return res.status(400).json({ error: "Invalid avatar URL" });
            }

            const updates = {};
            if (username) updates.username = username;
            if (avatarUrl) updates.avatarUrl = avatarUrl;

            const result = await usersCollection.updateOne(
                { _id: id },
                { $set: updates }
            );

            return res.status(200).json({
                message: "Profile updated",
                updated: result.modifiedCount > 0
            });
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
