export async function onRequestPost({ request, env }) {
  try {
    const { name, email, phone, preferred_time, note } = await request.json();

    if (!name || !email || !phone) {
      return new Response(JSON.stringify({ error: "Name, Email, and Phone number are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(JSON.stringify({ error: "Please provide a valid email address." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    const sanitizedPhone = phone.replace(/[\s\-\(\)]/g, "");

    if (!phoneRegex.test(sanitizedPhone)) {
      return new Response(JSON.stringify({ error: "Phone number must be in international format starting with '+' (e.g. +91 9876543210)." }), {
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
