/* ============================================================
   Morning AI Forum — 2026
   D-day / nav / session filter+accordion / reveal / counters / form
   ============================================================ */

(function () {
    'use strict';

    /* --- 신청 데이터 수신처. Google Form/Formspree 연결 시 여기만 교체 --- */
    var FORM_ENDPOINT = '';           // 예: 'https://formspree.io/f/xxxx'
    var CONTACT_EMAIL = 'contact@nextcw.com';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ========== 1. 다음 세션 계산 (매월 둘째 주 금요일 07:00) ========== */
    function secondFriday(year, month) {
        var d = new Date(year, month, 1);
        // 첫 금요일까지의 offset (5 = Friday)
        var offset = (5 - d.getDay() + 7) % 7;
        return new Date(year, month, 1 + offset + 7, 7, 0, 0, 0);
    }

    function nextSession(from) {
        var s = secondFriday(from.getFullYear(), from.getMonth());
        if (s.getTime() <= from.getTime()) {
            s = secondFriday(from.getFullYear(), from.getMonth() + 1);
        }
        return s;
    }

    function renderSessionDate() {
        var now = new Date();
        var next = nextSession(now);

        var y = next.getFullYear();
        var m = String(next.getMonth() + 1).padStart(2, '0');
        var d = String(next.getDate()).padStart(2, '0');

        var msPerDay = 24 * 60 * 60 * 1000;
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var target = new Date(y, next.getMonth(), next.getDate());
        var days = Math.round((target - today) / msPerDay);
        var dday = days === 0 ? 'D-DAY' : 'D-' + days;

        var label = document.getElementById('nextSessionLabel');
        if (label) label.textContent = 'NEXT SESSION · ' + y + '.' + m + '.' + d + ' (FRI) 07:00';

        ['heroDday', 'headerDday', 'stickyDday'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.textContent = dday;
        });

        var applyDate = document.getElementById('applyNextDate');
        if (applyDate) {
            applyDate.textContent = y + '년 ' + (next.getMonth() + 1) + '월 ' + next.getDate() + '일(금) 오전 7시';
        }
    }

    /* ========== 2. 헤더 / 스크롤 진행 / 섹션 추적 ========== */
    var header = document.getElementById('siteHeader');
    var progress = document.getElementById('scrollProgress');
    var stickyCta = document.getElementById('stickyCta');
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
    var sections = navLinks
        .map(function (a) { return document.querySelector(a.getAttribute('href')); })
        .filter(Boolean);

    var ticking = false;

    function onScroll() {
        var y = window.scrollY || window.pageYOffset;
        var docH = document.documentElement.scrollHeight - window.innerHeight;

        if (header) header.classList.toggle('is-stuck', y > 24);
        if (progress) progress.style.width = (docH > 0 ? (y / docH) * 100 : 0) + '%';
        if (stickyCta) stickyCta.classList.toggle('is-shown', y > window.innerHeight * 0.8);

        // active nav
        var marker = y + (window.innerHeight * 0.32);
        var activeIdx = -1;
        for (var i = 0; i < sections.length; i++) {
            if (sections[i].offsetTop <= marker) activeIdx = i;
        }
        navLinks.forEach(function (a, i) { a.classList.toggle('is-active', i === activeIdx); });

        ticking = false;
    }

    window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
    }, { passive: true });

    /* ========== 3. 모바일 내비게이션 ========== */
    var navToggle = document.getElementById('navToggle');
    var mobileNav = document.getElementById('mobileNav');

    function closeMobileNav() {
        if (!navToggle || !mobileNav) return;
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', '메뉴 열기');
        mobileNav.hidden = true;
    }

    if (navToggle && mobileNav) {
        navToggle.addEventListener('click', function () {
            var open = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', String(!open));
            navToggle.setAttribute('aria-label', open ? '메뉴 열기' : '메뉴 닫기');
            mobileNav.hidden = open;
        });
        mobileNav.addEventListener('click', function (e) {
            if (e.target.tagName === 'A') closeMobileNav();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeMobileNav();
        });
    }

    /* ========== 4. 스크롤 리빌 (스태거) ========== */
    var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

    if (!('IntersectionObserver' in window) || reduceMotion) {
        revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
        var groups = new Map();
        revealEls.forEach(function (el) {
            var parent = el.parentElement;
            var arr = groups.get(parent) || [];
            arr.push(el);
            groups.set(parent, arr);
        });
        groups.forEach(function (arr) {
            arr.forEach(function (el, i) { el.style.setProperty('--d', (i * 70) + 'ms'); });
        });

        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

        revealEls.forEach(function (el) { revealObserver.observe(el); });
    }

    /* ========== 5. 숫자 카운트업 ========== */
    var counters = Array.prototype.slice.call(document.querySelectorAll('.count'));

    function runCount(el) {
        var to = parseInt(el.getAttribute('data-count-to'), 10) || 0;
        if (reduceMotion) { el.textContent = String(to); return; }
        var dur = 1100, start = null;
        function step(ts) {
            if (start === null) start = ts;
            var p = Math.min((ts - start) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.round(to * eased));
            if (p < 1) window.requestAnimationFrame(step);
        }
        window.requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) {
        counters.forEach(runCount);
    } else {
        var countObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                runCount(entry.target);
                countObserver.unobserve(entry.target);
            });
        }, { threshold: 0.6 });
        counters.forEach(function (el) { countObserver.observe(el); });
    }

    /* ========== 6. 세션 아코디언 ========== */
    var sessionHeads = Array.prototype.slice.call(document.querySelectorAll('.session-head'));
    sessionHeads.forEach(function (head) {
        head.addEventListener('click', function () {
            var card = head.closest('.session');
            var open = card.classList.toggle('is-open');
            head.setAttribute('aria-expanded', String(open));
        });
    });

    /* ========== 7. 세션 태그 필터 ========== */
    var chips = Array.prototype.slice.call(document.querySelectorAll('.filter-chip'));
    var sessionCards = Array.prototype.slice.call(document.querySelectorAll('.session'));

    chips.forEach(function (chip) {
        chip.addEventListener('click', function () {
            var filter = chip.getAttribute('data-filter');
            chips.forEach(function (c) { c.classList.toggle('is-active', c === chip); });

            sessionCards.forEach(function (card) {
                var tags = (card.getAttribute('data-tags') || '').split(/\s+/);
                var match = filter === 'all' || tags.indexOf(filter) !== -1;
                card.classList.toggle('is-hidden', !match);
                if (!match) {
                    card.classList.remove('is-open');
                    var h = card.querySelector('.session-head');
                    if (h) h.setAttribute('aria-expanded', 'false');
                }
            });
        });
    });

    /* ========== 8. FAQ — 한 번에 하나만 열기 ========== */
    var faqs = Array.prototype.slice.call(document.querySelectorAll('.faq'));
    faqs.forEach(function (faq) {
        faq.addEventListener('toggle', function () {
            if (!faq.open) return;
            faqs.forEach(function (other) { if (other !== faq) other.open = false; });
        });
    });

    /* ========== 9. 신청 폼 ========== */
    var form = document.getElementById('applyForm');
    var done = document.getElementById('applyDone');
    var summaryEl = document.getElementById('applySummary');
    var errorEl = document.getElementById('formError');
    var againBtn = document.getElementById('applyAgain');

    function showError(msg, field) {
        if (!errorEl) return;
        errorEl.textContent = msg;
        errorEl.hidden = false;
        if (field) { field.classList.add('has-error'); field.focus(); }
    }

    function clearError() {
        if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }
        form.querySelectorAll('.has-error').forEach(function (el) { el.classList.remove('has-error'); });
    }

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            clearError();

            var name = form.elements['name'];
            var org = form.elements['org'];
            var email = form.elements['email'];

            if (!name.value.trim()) return showError('이름을 입력해 주세요.', name);
            if (!org.value.trim()) return showError('소속과 직함을 입력해 주세요.', org);
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
                return showError('올바른 이메일 주소를 입력해 주세요.', email);
            }

            var interests = Array.prototype.slice
                .call(form.querySelectorAll('input[name="interest"]:checked'))
                .map(function (el) { return el.value; });

            var data = {
                name: name.value.trim(),
                org: org.value.trim(),
                email: email.value.trim(),
                tier: form.elements['tier'].value,
                interest: interests.length ? interests.join(', ') : '(미선택)',
                topic: form.elements['topic'].value.trim() || '(미작성)',
                referrer: form.elements['referrer'].value.trim() || '(없음)'
            };

            var body = [
                '[Morning AI Forum 2026 멤버 신청]',
                '',
                '이름      : ' + data.name,
                '소속/직함 : ' + data.org,
                '이메일    : ' + data.email,
                '신청 유형 : ' + data.tier,
                '관심 세션 : ' + data.interest,
                '추천인    : ' + data.referrer,
                '',
                '발표 가능 주제 / 풀고 싶은 문제',
                '----------------------------------------',
                data.topic
            ].join('\n');

            if (summaryEl) summaryEl.textContent = body;

            if (FORM_ENDPOINT) {
                fetch(FORM_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(data)
                }).catch(function () { /* 실패해도 아래 안내 화면은 유지 */ });
            } else {
                var subject = '[모닝AI포럼] 멤버 신청 - ' + data.name + ' (' + data.org + ')';
                window.location.href = 'mailto:' + CONTACT_EMAIL +
                    '?subject=' + encodeURIComponent(subject) +
                    '&body=' + encodeURIComponent(body);
            }

            form.hidden = true;
            if (done) {
                done.hidden = false;
                done.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
            }
        });
    }

    if (againBtn) {
        againBtn.addEventListener('click', function () {
            if (done) done.hidden = true;
            if (form) {
                form.hidden = false;
                form.reset();
                clearError();
                form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
            }
        });
    }

    /* ========== 10. 초기 실행 ========== */
    renderSessionDate();
    onScroll();
})();
