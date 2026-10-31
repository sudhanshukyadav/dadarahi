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

        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        const sanitizedPhone = String(phone).replace(/[\s\-()]/g, "");

        if (!phoneRegex.test(sanitizedPhone)) {
          return new Response(JSON.stringify({ error: "Invalid international phone format." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // 1. Insert the new record into Cloudflare D1
        const insertQuery = `
          INSERT INTO callbacks (name, email, phone, preferred_time, note)
          VALUES (?, ?, ?, ?, ?)
        `;
        await env.DB.prepare(insertQuery)
          .bind(
            String(name).trim(),
            String(email).trim().toLowerCase(),
            sanitizedPhone,
            (preferred_time ? String(preferred_time) : "").trim(),
            (note ? String(note) : "").trim()
          )
          .run();

        // 2. Fetch the latest 50 records from the database to include in the email
        const { results } = await env.DB.prepare("SELECT * FROM callbacks ORDER BY id DESC LIMIT 50").all();
        
        // Format the database records into a clean HTML table for the email
        const tableRows = results.map(row => 
          `<tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${row.name}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${row.phone}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${row.preferred_time || 'N/A'}</td>
          </tr>`
        ).join('');

        // 3. Send the automated email using Resend API
        // NOTE: Requires env.RESEND_API_KEY to be set in your Cloudflare dashboard/wrangler
        if (env.RESEND_API_KEY) {
          const emailHtml = `
            <h2>New Callback Request Received</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Phone:</strong> ${sanitizedPhone}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Note:</strong> ${note || 'None'}</p>
            <br/>
            <h3>Recent Database Entries (Latest 50)</h3>
            <table style="border-collapse: collapse; width: 100%; text-align: left;">
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #ddd; padding: 8px;">Name</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Phone</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Time</th>
              </tr>
              ${tableRows}
            </table>
          `;

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Acme <onboarding@resend.dev>', // Resend's default testing address
              to: 'yadav.sudhanshu@gmail.com',         // REPLACE WITH YOUR RECEIVING EMAIL
              subject: 'New Callback Request & Database Snapshot',
              html: emailHtml
            })
          });
        }

        return new Response(JSON.stringify({ success: true, message: "Request saved and email sent." }), {
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

    // Fallback to serve static assets
    return env.ASSETS.fetch(request);
  }
};
