export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. API endpoint to handle form submission
    if (url.pathname === "/api/callback" && request.method === "POST") {
      try {
        const { name, email, phone, preferred_time, note } = await request.json();

        // Validate required fields
        if (!name || !email || !phone) {
          return new Response(JSON.stringify({ error: "Name, Email, and Phone are required." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Validate international phone format
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        const sanitizedPhone = String(phone).replace(/[\s\-()]/g, "");

        if (!phoneRegex.test(sanitizedPhone)) {
          return new Response(JSON.stringify({ error: "Phone number must be in international format starting with '+' (e.g. +91...)." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // SQL Query for Cloudflare D1
        const query = `
          INSERT INTO callbacks (name, email, phone, preferred_time, note)
          VALUES (?, ?, ?, ?, ?)
        `;

        await env.DB.prepare(query)
          .bind(
            String(name).trim(),
            String(email).trim().toLowerCase(),
            sanitizedPhone,
            (preferred_time ? String(preferred_time) : "").trim(),
            (note ? String(note) : "").trim()
          )
          .run();

        return new Response(JSON.stringify({ success: true, message: "Callback request registered successfully." }), {
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

    // 2. Fallback to serve all static assets
    return env.ASSETS.fetch(request);
  }
};
