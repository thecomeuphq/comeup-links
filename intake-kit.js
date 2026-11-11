document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("leadForm");
  const submitBtn = document.getElementById("submitBtn");
  const statusMessage = document.getElementById("statusMessage");

  // Relay endpoint — substituted with the real Worker URL at deploy time.
  const RELAY_URL = "https://intake-relay.leroybradley7.workers.dev/signup";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Disable button to prevent double submissions
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing...";
    statusMessage.classList.add("hidden");

    const formData = new FormData(form);
    const payload = {
      first_name: (formData.get("first_name") || "").trim(),
      email: (formData.get("email") || "").trim(),
      niche: formData.get("niche") || "",
      hp: formData.get("hp") || ""
    };

    try {
      const response = await fetch(RELAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      let body = null;
      try {
        body = await response.json();
      } catch (parseError) {
        body = null;
      }

      // Success is shown ONLY on a confirmed capture: HTTP ok AND the
      // relay's own ok flag true. Duplicates count — the lead is already in.
      if (response.ok && body && body.ok === true) {
        showStatus("Success! Your Intake Kit is on its way to your inbox.", "success");
        form.reset();
      } else {
        showStatus("Something went wrong and your request was not saved. Please try again.", "error");
      }
    } catch (error) {
      // Network failure, unreadable response, anything else: no success, ever.
      showStatus("Something went wrong and your request was not saved. Please check your connection and try again.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = "Get The Intake Kit Free";
    }
  });

  function showStatus(message, type) {
    statusMessage.innerText = message;
    statusMessage.classList.remove("hidden", "bg-emerald-950", "text-emerald-400", "bg-rose-950", "text-rose-400", "border", "border-emerald-800", "border-rose-800");

    if (type === "success") {
      statusMessage.classList.add("bg-emerald-950", "text-emerald-400", "border", "border-emerald-800");
    } else {
      statusMessage.classList.add("bg-rose-950", "text-rose-400", "border", "border-rose-800");
    }
  }
});
