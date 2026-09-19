const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("nogorbondhu");
    const departmentCollection = db.collection('departments');
    const authorityCollection = db.collection('authorities');

    app.post("/departments", async (req, res) => {
      const data = req.body;
      console.log(data);
      const departmentData = {
        departmentName: data.departmentName,
        description: data.description,
        status: data.status || "active",
        createdAt: new Date()
      }
      const result = await departmentCollection.insertOne(departmentData);
      res.json(result);
    });

    app.get("/departments", async (req, res) => {
      const result = await departmentCollection.find({}).toArray();
      res.json(result);
    });

    app.post("/authorities", async (req, res) => {
      const authority = req.body;

      const authorityData = {
        authorityName: authority.authorityName,
        authorityType: authority.authorityType,

        departmentId: authority.departmentId,
        departmentName: authority.departmentName,

        coverage: {
          level: authority.coverage?.level || null,
          divisionId: authority.coverage?.divisionId || null,
          districtId: authority.coverage?.districtId || null,
          upazilaId: authority.coverage?.upazilaId || null,
        },

        status: authority.status || "active",

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await authorityCollection.insertOne(authorityData);

      res.json(result);
    });

    app.get("/authorities", async (req, res) => {
      const result = await authorityCollection.find({}).toArray();
      res.json(result);
    });


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("NagarBondhu Server is running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});