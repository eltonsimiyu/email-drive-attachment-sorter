# 📩 Email Attachment Sorter  

## Overview  
This project fetches email attachments from Gmail, categorizes them using AI, and uploads them to Google Drive in organized folders. It prevents duplicate uploads and allows filtering by date.  

## Features  
- 🔐 Google Authentication  
- 📥 Fetch Gmail Attachments  
- 🧠 AI-based File Categorization  
- ☁️ Auto Upload to Google Drive  
- 🚫 Duplicate File Prevention  

## Setup  
1. **Clone the Repository**  
   ```bash
   git clone https://github.com/eltonsimiyu/email-drive-attachment-sorter.git
   cd email-drive-attachment-sorter
   ```  
2. **Install Dependencies**  
   ```bash
   npm install
   ```  
3. **Run the Server**  
   ```bash
   node server.js
   ```  
4. **Start the Frontend**  
   ```bash
   cd email-sorter  
   npm start
   ```  

## Usage  
- Authenticate with Google  
- Select date filters (optional)  
- Click "Fetch Attachments"  
- AI sorts & uploads files to Drive  

## Notes  
- Keep `credentials.json` and `token.json` private.  
- Requires Google Cloud API access.  
