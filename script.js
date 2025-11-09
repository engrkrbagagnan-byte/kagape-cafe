// Main site script: slideshow (if present) and contact form handling
document.addEventListener('DOMContentLoaded', () => {
  console.log('Welcome to Kagape Café website ☕');

  // --- Slideshow (optional) ---
  (function initSlideshow() {
    let slideIndex = 0;
    const slides = document.getElementsByClassName('mySlides');
    const dots = document.getElementsByClassName('dot');
    if (!slides || slides.length === 0) return; // no slideshow on this page

    function showSlide(n) {
      // Reset index if out of bounds
      if (n >= slides.length) slideIndex = 0;
      if (n < 0) slideIndex = slides.length - 1;
      else slideIndex = n;

      // Remove active class from all slides and dots
      Array.from(slides).forEach(slide => slide.classList.remove('active'));
      Array.from(dots).forEach(dot => dot.classList.remove('active'));

      // Show active slide and dot
      slides[slideIndex].classList.add('active');
      dots[slideIndex].classList.add('active');
    }

    function nextSlide() {
      showSlide(slideIndex + 1);
    }

    // Add click handlers to dots
    Array.from(dots).forEach((dot, index) => {
      dot.addEventListener('click', () => showSlide(index));
    });

    // Start the slideshow
    showSlide(0);

    // Pause on hover support and continuous looping
    const container = document.querySelector('.slideshow-container');
    let slideshowPaused = false;

    if (container) {
      container.addEventListener('mouseenter', () => {
        slideshowPaused = true;
      });

      container.addEventListener('mouseleave', () => {
        slideshowPaused = false;
      });
    }

    // Use a single interval that respects the paused flag so slideshow "goes on and on"
    setInterval(() => {
      if (!slideshowPaused) nextSlide();
    }, 5000);
  })();

  // --- Contact form handling ---
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = document.getElementById('contactSubmit');
  const feedback = document.getElementById('formFeedback');

  function showFeedback(message, type = 'info') {
    feedback.textContent = message;
    feedback.className = 'form-feedback ' + (type === 'error' ? 'error' : type === 'success' ? 'success' : 'info');
  }

  function validateEmail(email) {
    // Simple email regex (reasonable for client-side validation)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // gather values
    const name = (form.querySelector('#name') || {}).value?.trim() || '';
    const email = (form.querySelector('#email') || {}).value?.trim() || '';
    const message = (form.querySelector('#message') || {}).value?.trim() || '';

    // basic validation
    if (!name || !email || !message) {
      showFeedback('Please fill in all fields before sending.', 'error');
      return;
    }
    if (!validateEmail(email)) {
      showFeedback('Please enter a valid email address.', 'error');
      return;
    }

    // disable button + show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    const endpoint = form.dataset.formUrl && form.dataset.formUrl.trim();

    try {
      if (endpoint) {
        // Send as form data (works with many form endpoints like Formspree)
        const fd = new FormData();
        fd.append('name', name);
        fd.append('email', email);
        fd.append('message', message);

        const resp = await fetch(endpoint, {
          method: 'POST',
          body: fd,
          headers: { 'Accept': 'application/json' }
        });

        if (resp.ok) {
          showFeedback('Thanks — your message has been sent!', 'success');
          form.reset();
        } else {
          // try to read JSON error message
          let errText = 'An error occurred while sending your message.';
          try { const j = await resp.json(); if (j && j.error) errText = j.error; } catch (_) {}
          showFeedback(errText, 'error');
        }
      } else {
        // Fallback: open user's email client with prefilled content (mailto)
        const subject = encodeURIComponent('Contact from Kagape Café website');
        const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
        window.location.href = `mailto:kagapecafe@gmail.com?subject=${subject}&body=${body}`;
        // Inform user that their mail client should open
        showFeedback('Your email client should open to finish sending the message.', 'info');
        form.reset();
      }
    } catch (err) {
      console.error('Contact form error:', err);
      showFeedback('Network error — please try again later.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });

  // --- Customer reviews (index page) ---
  (function initReviews() {
    const reviewsList = document.getElementById('reviewsList');
    const reviewForm = document.getElementById('reviewForm');
    if (!reviewsList || !reviewForm) return;

    function loadReviews() {
      try {
        const raw = localStorage.getItem('kagape_reviews');
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    }

    function saveReviews(list) {
      localStorage.setItem('kagape_reviews', JSON.stringify(list));
    }

    function renderReviews() {
      const items = loadReviews();
      const sideList = document.getElementById('reviewsSideList');
      const sidePanel = document.getElementById('reviewsSide');

      if (!items || items.length === 0) {
        reviewsList.innerHTML = '<li class="no-reviews">No reviews yet — be the first to leave one!</li>';
        if (sideList) sideList.innerHTML = '';
        if (sidePanel) sidePanel.classList.add('hidden');
        return;
      }

      // Main reviews list (full page)
      reviewsList.innerHTML = items.map((r, idx) => `
        <li class="review-item" data-idx="${idx}">
          <div class="review-head">
            <strong class="review-name">${escapeHtml(r.name)}</strong>
            <span class="review-rating">${renderStars(r.rating)}</span>
            <time class="review-time">${new Date(r.when).toLocaleString()}</time>
          </div>
          <p class="review-text">${escapeHtml(r.text)}</p>
          <div class="review-actions"><button class="btn btn-outline btn-delete" data-idx="${idx}">Delete</button></div>
        </li>
      `).join('');

      // Side panel shows the most recent 3 reviews (shortened)
      if (sideList) {
        sideList.innerHTML = items.slice(0, 3).map(r => `
          <li class="review-side-item">
            <div class="side-name">${escapeHtml(r.name)}</div>
            <div class="side-rating">${renderStars(r.rating)}</div>
            <div class="side-text">${escapeHtml((r.text || '').length > 100 ? (r.text.slice(0, 97) + '...') : r.text)}</div>
          </li>
        `).join('');
      }

      // Ensure side panel visible
      if (sidePanel) sidePanel.classList.remove('hidden');

      // attach delete handlers for main list
      reviewsList.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.dataset.idx);
          const items = loadReviews();
          if (!items || idx < 0 || idx >= items.length) return;
          if (!confirm('Delete this review?')) return;
          items.splice(idx, 1);
          saveReviews(items);
          renderReviews();
        });
      });
    }

    function renderStars(count) {
      count = parseInt(count) || 0;
      let out = '';
      for (let i = 0; i < 5; i++) {
        out += i < count ? '★' : '☆';
      }
      return `<span class="stars-display">${out}</span>`;
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    reviewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (document.getElementById('reviewerName') || {}).value || 'Anonymous';
      const text = (document.getElementById('reviewText') || {}).value || '';
      const ratingEl = document.querySelector('input[name="rating"]:checked');
      const rating = ratingEl ? parseInt(ratingEl.value) : 1;
      if (!text.trim()) return;
      const list = loadReviews();
      list.unshift({ name: name.trim(), text: text.trim(), when: new Date().toISOString(), rating });
      if (list.length > 20) list.pop();
      saveReviews(list);
      renderReviews();
      reviewForm.reset();
    });

    // initial render
    renderReviews();
    // char counter behavior
    const reviewText = document.getElementById('reviewText');
    const charCount = document.getElementById('charCount');
    if (reviewText && charCount) {
      const update = () => charCount.textContent = (reviewText.value || '').length;
      reviewText.addEventListener('input', update);
      update();
    }

    // Side panel toggle behavior (if side exists)
    const sideToggle = document.getElementById('reviewsSideToggle');
    const sidePanel = document.getElementById('reviewsSide');
    if (sideToggle && sidePanel) {
      sideToggle.addEventListener('click', () => {
        sidePanel.classList.toggle('collapsed');
      });
      // small UX: clicking "See all" (link) will scroll to full reviews; handled by anchor
    }
  })();

  
});
