const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const multer = require("multer");
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

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG and PNG images are allowed"));
    }
  },
});

app.post("/upload-image", upload.single("image"), async (req, res) => {
    try {
        

        const formData = new FormData();

        const blob = new Blob([req.file.buffer], {
            type: req.file.mimetype,
        });

        formData.append("image", blob, req.file.originalname);

        const response = await fetch(
            `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
            {
                method: "POST",
                body: formData,
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            console.error("ImgBB error:", result);

            return res.status(502).json({
                message: result.error?.message || "ImgBB upload failed",
            });
        }

        res.status(200).json({
            message: "Image uploaded successfully",
            url: result.data.url,
        });
    } catch (error) {
    console.error("Image upload error:", error);
    console.error("Error cause:", error.cause);

    res.status(500).json({
        message: error.message,
        cause: error.cause?.message,
    });
    }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("nogorbondhu");
    const departmentCollection = db.collection('departments');
    const authorityCollection = db.collection('authorities');
    const rolesCollection = db.collection('roles');
    const problemCategoriesCollection = db.collection('problemCategories');
    const reportCollection = db.collection('reports');

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

    app.get("/authorities/:id", async (req, res) => {
      const id = req.params.id;

      const result = await authorityCollection.findOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    app.get("/roles/:slug", async (req, res) => {
      const slug = req.params.slug;

      const result = await rolesCollection.findOne({
        slug: slug,
        isActive: true,
      });

      res.json(result);
    });
    app.post("/roles", async (req, res) => {
      const data = req.body;

      const roleData = {
        name: data.name,
        slug: data.slug,
        permissions: data.permissions,
        isActive: data.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await rolesCollection.insertOne(roleData);

      res.json(result);
    });

    app.get("/roles", async (req, res) => {
      const result = await rolesCollection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      res.json(result);
    });

    app.post("/problemCategories", async (req, res) => {
      const data = req.body;

      console.log(data);

      const problemCategoryData = {
        categoryName: data.categoryName,
        description: data.description,
        departmentId: data.departmentId,
        departmentName: data.departmentName,
        authorityId: data.authorityId,
        authorityName: data.authorityName,
        status: data.status || "active",
        createdAt: new Date()
      };

      const result = await problemCategoriesCollection.insertOne(
        problemCategoryData
      );

      res.json(result);
    });

    app.get("/problemCategories", async (req, res) => {
      const result = await problemCategoriesCollection
        .find()
        .sort({ createdAt: -1 })
        .toArray();

      res.json(result);
    });

    app.post("/reports", async (req, res) => {
      const data = req.body;

      const reportData = {
        ...data,
        userId: data.userId,
        evidence: data.evidence || [],
        status: "pending",
        createdAt: new Date(),
      };

      const result = await reportCollection.insertOne(reportData);

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