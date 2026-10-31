export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Process Callback Submissions
    if (url.pathname === "/api/callback" && request.method === "POST") {
      try {
        const { name, email, phone, preferred_time, note } = await request.json();

        if (!name || !email || !phone) {
          return new Response(JSON.stringify({ error: "Name, Email, and Phone are required." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        const sanitizedPhone = phone.replace(/[\s\-\(\)]/g, "");

        if (!phoneRegex.test(sanitizedPhone)) {
          return new Response(JSON.stringify({ error: "Phone number must be in international format starting with '+'." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const query = `
          INSERT INTO callbacks (name, email, phone, preferred_time, note)
          VALUES (?, ?, ?, ?, ?)
        `;

        await env.DB.prepare(query)
          .bind(
            name.trim(),
            email.trim().toLowerCase(),
            sanitizedPhone,
            (preferred_time || "").trim(),
            (note || "").trim()
          )
          .run();

        return new Response(JSON.stringify({ success: true, message: "Callback registered successfully." }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 2. Serve static assets (index.html, contact.html, images)
    return env.ASSETS.fetch(request);
  }
};
