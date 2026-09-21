const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("nogorbondhu");
    const departmentCollection = db.collection('departments');
    const authorityCollection = db.collection('authorities');
    const authorityInvitationCollection = db.collection("authorityInvitations");

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

    app.post("/authority-invitations", async (req, res) => {
      const { authorityId, name, email } = req.body;

      const authority = await authorityCollection.findOne({
        _id: new ObjectId(authorityId),
      });

      const token = crypto.randomBytes(32).toString("hex");
      const inviteUrl = `${process.env.CLIENT_URL}/authority/invite/${token}`;

      const invitation = {
        authorityId: authority._id,
        name,
        email,
        role: "authority",
        status: "pending",
        token,
        createdAt: new Date(),
      };
      await transporter.sendMail({
        from: `"NogorBondhu" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Invitation to Join NogorBondhu",
        html: `
        <div>
          <h2>NogorBondhu Authority Head Invitation</h2>

          <p>Hello ${name},</p>

          <p>
            You have been invited to join NagarBondhu
            as an Authority Head.
          </p>

          <p>
            Please click the button below to accept your invitation
            and create your account.
          </p>

          <a
            href="${inviteUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #0F6848;
              color: white;
              text-decoration: none;
              border-radius: 6px;
            "
          >
            Accept Invitation
          </a>

          <p>
            This invitation link is intended only for you.
          </p>

          <p>Regards,<br />NogorBondhu Team</p>
        </div>
      `,
      });

      const result = await authorityInvitationCollection.insertOne(invitation);
      res.json(result);
    });

    app.get("/authority-invitations", async (req, res) => {
      const invitation = await authorityInvitationCollection.find({}).toArray();
      res.json(invitation);
    });

    app.get("/authority-invitations/authority/:authorityId", async (req, res) => {
      const { authorityId } = req.params;

      const invitation = await authorityInvitationCollection.findOne({
        authorityId: new ObjectId(authorityId),
      });

      res.json(invitation);
    });

    app.get("/authority-invitations/:token", async (req, res) => {
        const { token } = req.params;

        const invitation = await authorityInvitationCollection.findOne({
          token,
        });

        if (!invitation) {
          return res.status(404).json({
            success: false,
            message: "Invalid invitation",
          });
        }

        if (invitation.status !== "pending") {
          return res.status(400).json({
            success: false,
            message: "This invitation has already been used",
          });
        }

        res.json({
          success: true,
          invitation: {
            name: invitation.name,
            email: invitation.email,
            role: invitation.role,
            authorityId: invitation.authorityId,
          },
        });
      
    });
   
    app.post("/authority-invitations/accept", async (req, res) => {
    const { token, email } = req.body;

    const invitation = await authorityInvitationCollection.findOne({
      token,
      status: "pending",
    });

    const user = await db.collection("user").findOne({
      email: invitation.email,
    });
    await db.collection("user").updateOne(
      { _id: user._id },
      {
        $set: {
          role: "authority",
          authorityId: invitation.authorityId.toString(),
          updatedAt: new Date(),
        },
      }
    );
    await authorityInvitationCollection.updateOne(
      { _id: invitation._id },
      {
        $set: {
          status: "accepted",
          acceptedAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: "Invitation accepted successfully",
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