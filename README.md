# 🏕️ TrailExplorer Backend

### _Powering adventure discovery with a robust API_

[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel)](https://trail-explorer-backend.vercel.app)  
[![Frontend Repo](https://img.shields.io/badge/Frontend-GitHub-24292e?style=for-the-badge&logo=github)](https://github.com/4u6kopek/trail-explorer)

---

## 🔌 **API Endpoints**

| Endpoint                 | Method | Description                      |
| ------------------------ | ------ | -------------------------------- |
| `/api/trails`            | GET    | Fetch all trails (filterable)    |
| `/api/trails?id=:id`     | GET    | Get single trail details         |
| `/api/trails?userId=:id` | GET    | Get user's created trails        |
| `/api/trails`            | POST   | Create new trail (auth required) |
| `/api/trails?id=:id`     | PUT    | Update trail (owner only)        |
| `/api/trails?id=:id`     | DELETE | Delete trail (owner only)        |
| `/api/users`             | POST   | Register new user                |
| `/api/users?id=:id`      | GET    | Get user profile + saved trails  |

---

## 🛠️ **Tech Stack**

| Layer        | Technology        |
| ------------ | ----------------- |
| **Runtime**  | Node.js (v18+)    |
| **Database** | MongoDB Atlas     |
| **Auth**     | Firebase Auth     |
| **Hosting**  | Vercel Serverless |

---

## 🏗️ **Local Setup**

1. Clone repo:

   ```bash
   git clone https://github.com/4u6kopek/trail-explorer-backend.git
   cd trail-explorer-backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment (create `.env`):

   ```env
   MONGODB_URI=your_mongo_connection_string
   FIREBASE_API_KEY=your_firebase_key
   CORS_ORIGIN=https://trailexplorer-2a121.web.app
   ```

4. Run dev server:
   ```bash
   npm run dev
   ```

---

## 🌐 **Production Deployment**

Automatically deployed via Vercel on push to `main`:

```bash
git push origin main
```

---

## 💡 **Pro Tip**: Use [Postman](https://www.postman.com/) to test the endpoints.
