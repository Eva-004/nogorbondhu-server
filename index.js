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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
        // signal: AbortSignal.timeout(10000),
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

    await transporter.verify();
    console.log("Email server is ready!");
    const db = client.db("nogorbondhu");
    const departmentCollection = db.collection('departments');
    const authorityCollection = db.collection('authorities');
    const rolesCollection = db.collection('roles');
    const problemCategoriesCollection = db.collection('problemCategories');
    const reportCollection = db.collection('reports');
    const userCollection = db.collection('user');
    const notificationCollection = db.collection("notifications");

    app.get("/users", async (req, res) => {
      const result = await userCollection.find({}).toArray();
      res.json(result);
    });

    app.patch("/users/:id", async (req, res) => {
      const { id } = req.params;
      const { role, authority, department } = req.body;

      const updateData = {};
      if (role !== undefined) {
        updateData.role = role;
      }

      if (authority !== undefined) {
        updateData.authority = authority;
      }

      if (department !== undefined) {
        updateData.department = department;
      }
      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      res.json(result);

    });

    app.delete("/users/:id", async (req, res) => {
      const { id } = req.params;
      const result = await userCollection.deleteOne(
        { _id: new ObjectId(id) },
      );
      res.json(result);
    })

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
    app.get("/problemCategories/:id", async (req, res) => {

      const id = req.params.id;

      const result = await problemCategoriesCollection.findOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    app.post("/reports", async (req, res) => {
      const data = req.body;

      const reportData = {
        ...data,
        userId: data.userId,
        userName: data.userName,
        evidence: data.evidence || [],
        status: "pending",
        createdAt: new Date(),
      };

      const result = await reportCollection.insertOne(reportData);

      res.json(result);
    });



    app.get("/reports", async (req, res) => {

      const { search, upazila, category, priority } = req.query;
      const query = {};

      if (search?.trim()) {
        const searchRegex = {
          $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i",
        };

        query.$or = [
          { title: searchRegex },
          { userName: searchRegex },
        ];
      }

      if (upazila) {
        query["upazila.id"] = upazila;
      }

      if (category) {
        query["category.id"] = category;
      }

      if (priority) {
        query.priority = {
          $regex: `^${priority}$`,
          $options: "i",
        };
      }

      const result = await reportCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      res.json(result);

    });
    app.get("/reports/:id", async (req, res) => {

      const id = req.params.id;

      const result = await reportCollection.findOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });
    app.patch("/reports/:id/status", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      const result = await reportCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status,
            updatedAt: new Date(),
          },
        }
      );

      const report = await reportCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!report) {
        return res.status(404).send({ message: "Report not found" });
      }

      const user = await userCollection.findOne({
        _id: new ObjectId(report.userId),
      });

      const message =
        status === "resolved"
          ? `Good news! Your report "${report.title}" has been resolved.`
          : status === "rejected"
            ? `Your report "${report.title}" has been rejected. Please submit a new report.`
            : `Your report "${report.title}" status is now ${status}.`;

      const notification = {
        userId: report.userId,
        reportId: id,
        title: "Report Status Updated",
        message,
        type: ["resolved", "rejected"].includes(status)
          ? status
          : "status_update",
        isRead: false,
        createdAt: new Date(),
      };

      await notificationCollection.insertOne(notification);

      if (user?.email) {
        try {
          await transporter.sendMail({
            from: `"NagarBondhu" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "NagarBondhu - Report Status Updated",
            text: `Hello ${user.name},
            ${message}
            Regards
            NagarBondhu Team`,
          });
        } catch (error) {
          console.error("Email sending failed:", error);
        }
      }

      res.json(result);
    });
    app.get("/notifications/:userId", async (req, res) => {
      const { userId } = req.params;

      const notifications = await notificationCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();

      const unreadCount = notifications.filter(
        (notification) => !notification.isRead
      ).length;

      res.json({
        success: true,
        unreadCount,
        notifications,
      });
    });
    app.patch("/notifications/:id/read", async (req, res) => {
      const { id } = req.params;
      const { userId } = req.body;

      const result = await notificationCollection.updateOne(
        { _id: new ObjectId(id), userId },
        {
          $set: { isRead: true },
        }
      );

      res.json({
        success: true,
        message: "Notification marked as read",
      });
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