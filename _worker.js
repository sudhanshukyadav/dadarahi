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
        const sanitizedPhone = phone.replace(/[\s\-\(\)]/g, "");

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

        // env.DB accesses your Cloudflare D1 database binding
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

    // 2. Fallback to serve all static assets (index.html, contact.html, images)
    return env.ASSETS.fetch(request);
  }
};
const videoModal = document.getElementById('videoModal');
const modalIframe = document.getElementById('modalIframe');
const videoModalContainer = document.getElementById('videoModalContainer');

function openYouTubeVideo(id) {
  if (!videoModal || !modalIframe) return;

  // 1. Set video source with autoplay enabled
  modalIframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;

  // 2. Display the modal
  videoModal.classList.remove('hidden');
  videoModal.classList.add('flex');

  // 3. Request native browser fullscreen (Supported on Desktop & Android Chrome)
  if (videoModalContainer.requestFullscreen) {
    videoModalContainer.requestFullscreen().catch(() => {});
  } else if (videoModalContainer.webkitRequestFullscreen) {
    videoModalContainer.webkitRequestFullscreen();
  }
}

function closeVideoModal() {
  if (!videoModal || !modalIframe) return;

  // Exit native browser fullscreen if currently active
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }

  // Stop video playback and hide modal
  modalIframe.src = '';
  videoModal.classList.add('hidden');
  videoModal.classList.remove('flex');
}

// Close when clicking outside the video container
videoModal.addEventListener('click', (e) => {
  if (e.target === videoModal) {
    closeVideoModal();
  }
});

// Close when pressing the Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeVideoModal();
  }
});
