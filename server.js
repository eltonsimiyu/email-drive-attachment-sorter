const express = require("express");
const fs = require("fs");
const cors = require("cors");
const session = require("express-session");
const { google } = require("googleapis");
const { Readable } = require("stream");
const vision = require("@google-cloud/vision");
const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config(); // ? Use .env for API keys

const app = express();
app.use(express.json());

// ? Allowed CORS Origins
const allowedOrigins = ["http://localhost:5173", "http://localhost:3001", "http://192.168.2.99:3001"];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed for this origin"));
    }
  },
  methods: "GET,POST,PUT,DELETE",
  credentials: true
}));

// ? Session setup
app.use(session({
  secret: "your-secret-key",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
}));

// ? Load OAuth credentials
const credentials = JSON.parse(fs.readFileSync("credentials.json"));
const oauthConfig = credentials.installed || credentials.web;
if (!oauthConfig) throw new Error("Invalid credentials.json: Missing 'installed' or 'web' key.");

const { client_secret, client_id, redirect_uris } = oauthConfig;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// ? Google Vision Client for OCR
const visionClient = new vision.ImageAnnotatorClient();

// ? Function: Check or Create Folder in Google Drive
async function getOrCreateDriveFolder(drive, folderName) {
  try {
    // Search for an existing folder
    const existingFolders = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)"
    });

    if (existingFolders.data.files.length > 0) {
      return existingFolders.data.files[0].id; // Return existing folder ID
    }

    // ? Create a new folder
    const folder = await drive.files.create({
      requestBody: { name: folderName, mimeType: "application/vnd.google-apps.folder" },
      fields: "id",
    });

    return folder.data.id;
  } catch (error) {
    console.error("Error creating folder:", error);
    throw new Error("Failed to create folder in Drive.");
  }
}

// ? Extract Text Using OCR (for PDFs & Images)
async function extractTextFromFile(drive, fileId) {
  try {
    const file = await drive.files.get(
      { fileId: fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const imageBuffer = Buffer.from(file.data, "binary").toString("base64");
    const [result] = await visionClient.textDetection({
      image: { content: imageBuffer },
    });

    return result.fullTextAnnotation ? result.fullTextAnnotation.text : "";
  } catch (error) {
    console.error("OCR Processing Error:", error);
    return "";
  }
}

// ? AI Categorization Using GPT-4
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Store in .env
async function classifyWithAI(text) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: "Classify this document into one of the following categories: Financial, Legal, Technical, Personal, Other." },
          { role: "user", content: `Classify this document: ${text}` }
        ],
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("AI Classification Error:", error);
    return "Uncategorized";
  }
}

// ? Generate File Hash for Duplicates
function getFileHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// ? Fetch & Upload Attachments with AI Sorting
app.get("/fetch-attachments", async (req, res) => {
  if (!req.session.isAuthenticated || !req.session.tokens) {
    return res.status(403).json({ error: "User not authenticated" });
  }

  oAuth2Client.setCredentials(req.session.tokens);
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  const drive = google.drive({ version: "v3", auth: oAuth2Client });

  const { startDate, endDate } = req.query;
  let dateQuery = "";

  if (startDate) dateQuery = `after:${new Date(startDate).getTime() / 1000}`;
  if (endDate) dateQuery += ` before:${new Date(endDate).getTime() / 1000}`;

  try {
    const messages = await gmail.users.messages.list({ userId: "me", q: `has:attachment ${dateQuery}`, maxResults: 10 });
    if (!messages.data.messages) return res.json({ message: "No attachments found." });

    for (const msg of messages.data.messages) {
      const email = await gmail.users.messages.get({ userId: "me", id: msg.id });

      for (const part of email.data.payload.parts || []) {
        if (part.filename && part.body.attachmentId) {
          const attachment = await gmail.users.messages.attachments.get({
            userId: "me", messageId: msg.id, id: part.body.attachmentId,
          });

          const fileBuffer = Buffer.from(attachment.data.data, "base64");

          // ? Upload file first
          const file = await drive.files.create({
            requestBody: { name: part.filename, mimeType: part.mimeType },
            media: { mimeType: part.mimeType, body: Readable.from(fileBuffer) },
            fields: "id"
          });

          const fileId = file.data.id;

          // ? Step 1: Extract Text Using OCR
          const extractedText = await extractTextFromFile(drive, fileId);

          // ? Step 2: Categorize File Using AI
          const aiCategory = extractedText ? await classifyWithAI(extractedText) : "Uncategorized";

          // ? Step 3: Move file to the correct folder
          const folderId = await getOrCreateDriveFolder(drive, aiCategory);
          await drive.files.update({
            fileId: fileId,
            addParents: folderId,
            fields: "id, parents"
          });

          console.log(`?? Moved: ${part.filename} to ${aiCategory}`);
        }
      }
    }

    res.json({ message: "Attachments processed successfully" });
  } catch (error) {
    console.error("Error fetching attachments:", error);
    res.status(500).json({ error: "Failed to fetch attachments" });
  }
});

// ? Start Server
app.listen(3000, () => console.log("? Server running on http://localhost:3000"));
