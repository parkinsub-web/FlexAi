const navLinks = document.querySelectorAll('header.nav a[href^="#"]');

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const smoothScrollTo = (targetY, duration = 700) => {
  const startY = window.scrollY;
  const diff = targetY - startY;
  let start;

  const step = (ts) => {
    if (!start) start = ts;
    const time = ts - start;
    const progress = Math.min(time / duration, 1);
    const eased = easeInOut(progress);
    window.scrollTo(0, startY + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
};

navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const navHeight = document.querySelector('header.nav')?.offsetHeight || 0;
    const top = target.getBoundingClientRect().top + window.scrollY - (navHeight + 8);
    smoothScrollTo(top, 800);
  });
});

// subtle parallax for hero blob
const blob = document.querySelector('.hero-blob');
window.addEventListener('scroll', () => {
  if (!blob) return;
  const y = window.scrollY * 0.2;
  blob.style.transform = `translateY(${y}px)`;
});

const inquiryForm = document.getElementById('inquiryForm');
const inquiryList = document.getElementById('inquiryList');
const inquiryFeedback = document.getElementById('inquiryFeedback');
const refreshInquiryListBtn = document.getElementById('refreshInquiryList');

const escapeHtml = (value = '') =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatDate = (isoValue) => {
  if (!isoValue) return '';
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const renderInquiryList = (items = []) => {
  if (!inquiryList) return;
  if (!items.length) {
    inquiryList.innerHTML = '<li class="empty">등록된 문의가 없습니다.</li>';
    return;
  }

  inquiryList.innerHTML = items
    .map(
      (item, index) => `
      <li class="inquiry-item" style="animation-delay: ${index * 0.05}s" data-id="${item.id}">
        <div class="actions">
          <button type="button" class="btn-delete" onclick="deleteInquiry(${item.id})">삭제</button>
        </div>
        <div class="meta">
          <strong>${escapeHtml(item.title || '')}</strong>
          <span>${escapeHtml(item.name || '익명')} · ${formatDate(item.createdAt)}</span>
        </div>
        <p>${escapeHtml(item.message || '')}</p>
      </li>`
    )
    .join('');
};

window.deleteInquiry = async (id) => {
  if (!confirm('정말 이 문의를 삭제하시겠습니까?')) return;

  const itemEl = inquiryList.querySelector(`[data-id="${id}"]`);
  if (itemEl) {
    itemEl.style.transform = 'scale(0.95)';
    itemEl.style.opacity = '0.5';
  }

  try {
    const response = await fetch(`/api/inquiries/${id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || '삭제 실패');

    if (itemEl) {
      itemEl.style.transform = 'scale(0.8) translateY(20px)';
      itemEl.style.opacity = '0';
      setTimeout(() => loadInquiries(), 300);
    } else {
      await loadInquiries();
    }
  } catch (error) {
    alert(error.message);
    if (itemEl) {
      itemEl.style.transform = '';
      itemEl.style.opacity = '';
    }
  }
};

const setInquiryFeedback = (text, isError = false) => {
  if (!inquiryFeedback) return;
  inquiryFeedback.textContent = text;
  inquiryFeedback.classList.toggle('error', isError);

  // Clear success feedback after 5 seconds
  if (!isError && text) {
    setTimeout(() => {
      if (inquiryFeedback.textContent === text) {
        inquiryFeedback.textContent = '';
      }
    }, 5000);
  }
};

const loadInquiries = async () => {
  if (!inquiryList) return;

  try {
    const response = await fetch('/api/inquiries?limit=20');
    if (!response.ok) throw new Error('문의 목록 조회 실패');
    const data = await response.json();
    renderInquiryList(Array.isArray(data.items) ? data.items : []);
  } catch (error) {
    renderInquiryList([]);
    setInquiryFeedback('문의 목록을 불러오지 못했습니다.', true);
  }
};

if (inquiryForm) {
  inquiryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = inquiryForm.querySelector('.submit');
    const originalText = submitBtn.textContent;

    submitBtn.textContent = '등록 중...';
    submitBtn.disabled = true;

    setInquiryFeedback('');

    const formData = new FormData(inquiryForm);
    const payload = {
      name: (formData.get('name') || '').toString().trim(),
      email: (formData.get('email') || '').toString().trim(),
      phone: (formData.get('phone') || '').toString().trim(),
      title: (formData.get('title') || '').toString().trim(),
      message: (formData.get('message') || '').toString().trim(),
    };

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result?.error || '문의 등록 실패');
      }

      inquiryForm.reset();
      setInquiryFeedback('문의가 성공적으로 등록되었습니다.');
      await loadInquiries();
    } catch (error) {
      setInquiryFeedback(error.message || '문의 등록에 실패했습니다.', true);
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

if (refreshInquiryListBtn) {
  refreshInquiryListBtn.addEventListener('click', () => {
    loadInquiries();
  });
}

if (inquiryList) {
  loadInquiries();
}

/* ─── 상담 문의 (contactForm) ─── */
const contactForm = document.getElementById('contactForm');
const contactFeedback = document.getElementById('contactFeedback');

const setContactFeedback = (text, isError = false) => {
  if (!contactFeedback) return;
  contactFeedback.textContent = text;
  contactFeedback.classList.toggle('error', isError);
};

if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setContactFeedback('문의를 등록하는 중입니다...');

    const fd = new FormData(contactForm);
    const name = (fd.get('name') || '').toString().trim();
    const email = (fd.get('email') || '').toString().trim();
    const phone = (fd.get('phone') || '').toString().trim();
    const jobTitle = (fd.get('jobTitle') || '').toString().trim();

    // 체크박스 수집
    const interests = fd.getAll('interest');
    const difficulties = fd.getAll('difficulty');
    const messageText = (fd.get('message') || '').toString().trim();

    // title: 관심 분야를 제목으로 구성
    const title = interests.length
      ? `[상담 문의] ${interests.join(', ')}`
      : '[상담 문의]';

    // message: 직함 + 어려운 부분 + 문의사항 통합
    const parts = [];
    if (jobTitle) parts.push(`직함: ${jobTitle}`);
    if (difficulties.length) parts.push(`어려운 부분: ${difficulties.join(', ')}`);
    if (messageText) parts.push(`문의사항:\n${messageText}`);
    const message = parts.join('\n\n');

    if (!name || !message) {
      setContactFeedback('성함과 문의사항을 입력해주세요.', true);
      return;
    }

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, title, message }),
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result?.error || '문의 등록 실패');
      }

      contactForm.reset();
      setContactFeedback('상담 문의가 정상 등록되었습니다. 빠르게 확인 후 답변드리겠습니다.');
      // 고객문의 게시판 목록도 갱신
      if (inquiryList) await loadInquiries();
    } catch (error) {
      setContactFeedback(error.message || '문의 등록에 실패했습니다.', true);
    }
  });
}
