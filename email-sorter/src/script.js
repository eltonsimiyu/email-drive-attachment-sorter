document.addEventListener("DOMContentLoaded", () => {
    const authBtn = document.getElementById("auth-btn");
    const fetchAttachmentsBtn = document.getElementById("fetch-attachments-btn");
    const uploadBtn = document.getElementById("upload-btn");
    const mergeFoldersBtn = document.getElementById("merge-folders-btn");
    const deleteFoldersBtn = document.getElementById("delete-folders-btn");
    const resultList = document.getElementById("result-list");

    const addResult = (message, type = "info") => {
        const li = document.createElement("li");
        li.className = `list-group-item list-group-item-${type}`;
        li.textContent = message;
        resultList.appendChild(li);
    };

    authBtn.addEventListener("click", async () => {
        try {
            const res = await fetch("/auth");
            const data = await res.json();
            window.location.href = data.authUrl;
        } catch (error) {
            addResult("Error during authentication", "danger");
        }
    });

    fetchAttachmentsBtn.addEventListener("click", async () => {
        try {
            const res = await fetch("/fetch-attachments");
            const data = await res.json();
            if (data.attachments && data.attachments.length > 0) {
                data.attachments.forEach(att => addResult(`Fetched: ${att.filename}`, "success"));
            } else {
                addResult("No attachments found", "warning");
            }
        } catch (error) {
            addResult("Error fetching attachments", "danger");
        }
    });

    uploadBtn.addEventListener("click", async () => {
        try {
            const res = await fetch("/upload", { method: "POST" });
            const data = await res.json();
            addResult(`Uploaded File ID: ${data.fileId}`, "success");
        } catch (error) {
            addResult("Error uploading file", "danger");
        }
    });

    mergeFoldersBtn.addEventListener("click", async () => {
        try {
            const res = await fetch("/merge-folders", { method: "POST" });
            const data = await res.json();
            addResult(data.message, "success");
        } catch (error) {
            addResult("Error merging folders", "danger");
        }
    });

    deleteFoldersBtn.addEventListener("click", async () => {
        try {
            const res = await fetch("/delete-empty-folders", { method: "POST" });
            const data = await res.json();
            addResult(data.message, "success");
        } catch (error) {
            addResult("Error deleting folders", "danger");
        }
    });
});
