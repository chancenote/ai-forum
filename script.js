/* ============================================================
   Morning AI Forum — 2026
   D-day / nav / session filter+accordion / reveal / counters / form
   ============================================================ */

(function () {
    'use strict';

    /* --- 운영 설정은 config.js 에서 읽는다. 없거나 깨져도 기본값으로 동작한다 --- */
    var C = window.MAF_CONFIG || {};
    var CONTACT_EMAIL = C.contactEmail || 'contact@nextcw.com';
    var FORM_CFG = C.form || {};
    var FORM_PROVIDER = FORM_CFG.provider || 'mailto';
    var FORM_ENDPOINT = FORM_CFG.endpoint || '';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ========== 0. 이벤트 측정 ==========
       설치된 분석 도구를 자동 감지한다. 없으면 조용히 아무것도 하지 않는다. */
    function track(name, props) {
        if (C.analytics && C.analytics.enabled === false) return;
        try {
            if (typeof window.gtag === 'function') window.gtag('event', name, props || {});
            if (typeof window.va === 'function') window.va('event', { name: name, data: props || {} });
            if (typeof window.plausible === 'function') window.plausible(name, { props: props || {} });
            if (window.dataLayer && typeof window.dataLayer.push === 'function') {
                window.dataLayer.push(Object.assign({ event: name }, props || {}));
            }
        } catch (err) { /* 측정 실패가 사이트 동작을 막지 않는다 */ }
    }

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
        var next;
        var ov = C.nextSessionOverride;
        if (ov && /^\d{4}-\d{2}-\d{2}$/.test(ov)) {
            var parts = ov.split('-');
            next = new Date(+parts[0], +parts[1] - 1, +parts[2], 7, 0, 0, 0);
            if (isNaN(next.getTime())) next = nextSession(now);
        } else {
            next = nextSession(now);
        }

        var y = next.getFullYear();
        var m = String(next.getMonth() + 1).padStart(2, '0');
        var d = String(next.getDate()).padStart(2, '0');

        var msPerDay = 24 * 60 * 60 * 1000;
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var target = new Date(y, next.getMonth(), next.getDate());
        var days = Math.round((target - today) / msPerDay);
        var dday = days === 0 ? 'D-DAY' : 'D-' + days;

        var DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        var label = document.getElementById('nextSessionLabel');
        if (label) {
            label.textContent = 'NEXT SESSION · ' + y + '.' + m + '.' + d +
                ' (' + DOW[next.getDay()] + ') 07:00';
        }

        ['heroDday', 'headerDday', 'stickyDday'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.textContent = dday;
        });

        var KDOW = ['일', '월', '화', '수', '목', '금', '토'];
        var applyDate = document.getElementById('applyNextDate');
        if (applyDate) {
            applyDate.textContent = y + '년 ' + (next.getMonth() + 1) + '월 ' + next.getDate() +
                '일(' + KDOW[next.getDay()] + ') 오전 7시';
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

    /* ========== 9. 신청 폼 ==========
       provider 에 따라 실제 전송을 하고, 성공/실패를 정직하게 표시한다.
       전송이 실패하면 성공 화면을 보여주지 않고 메일 대안을 제시한다.      */
    var form = document.getElementById('applyForm');
    var done = document.getElementById('applyDone');
    var summaryEl = document.getElementById('applySummary');
    var errorEl = document.getElementById('formError');
    var againBtn = document.getElementById('applyAgain');
    var submitBtn = document.getElementById('applySubmit');
    var applyStarted = false;

    function showError(msg, field) {
        if (!errorEl) return;
        errorEl.textContent = msg;
        errorEl.hidden = false;
        if (field) { field.classList.add('has-error'); field.focus(); }
    }

    function clearError() {
        if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }
        Array.prototype.forEach.call(form.querySelectorAll('.has-error'), function (el) {
            el.classList.remove('has-error');
        });
    }

    function setBusy(busy) {
        if (!submitBtn) return;
        submitBtn.disabled = busy;
        submitBtn.textContent = busy ? '보내는 중…' : '신청서 보내기';
    }

    function buildBody(d) {
        return [
            '[Morning AI Forum 2026 멤버 신청]',
            '',
            '이름      : ' + d.name,
            '소속/직함 : ' + d.org,
            '이메일    : ' + d.email,
            '신청 유형 : ' + d.tier,
            '관심 세션 : ' + d.interest,
            '추천인    : ' + d.referrer,
            '',
            '발표 가능 주제 / 풀고 싶은 문제',
            '----------------------------------------',
            d.topic
        ].join('\n');
    }

    function openMailto(d) {
        var subject = '[모닝AI포럼] 멤버 신청 - ' + d.name + ' (' + d.org + ')';
        window.location.href = 'mailto:' + CONTACT_EMAIL +
            '?subject=' + encodeURIComponent(subject) +
            '&body=' + encodeURIComponent(buildBody(d));
    }

    /* 구글폼은 CORS 응답을 읽을 수 없으므로 숨은 iframe 으로 POST 한다. */
    function submitGoogleForm(d) {
        return new Promise(function (resolve, reject) {
            var map = FORM_CFG.googleFormFields || {};
            var filled = Object.keys(map).filter(function (k) { return map[k]; });
            if (!FORM_ENDPOINT || !filled.length) {
                return reject(new Error('구글폼 설정이 비어 있습니다.'));
            }
            var frameName = 'maf-gf-' + Date.now();
            var iframe = document.createElement('iframe');
            iframe.name = frameName;
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            var f = document.createElement('form');
            f.action = FORM_ENDPOINT;
            f.method = 'POST';
            f.target = frameName;
            f.style.display = 'none';
            filled.forEach(function (k) {
                var input = document.createElement('input');
                input.type = 'hidden';
                input.name = map[k];
                input.value = d[k] == null ? '' : String(d[k]);
                f.appendChild(input);
            });
            document.body.appendChild(f);

            var settled = false;
            function finish(ok, err) {
                if (settled) return;
                settled = true;
                setTimeout(function () {
                    if (f.parentNode) f.parentNode.removeChild(f);
                    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                }, 0);
                ok ? resolve() : reject(err);
            }
            iframe.addEventListener('load', function () { finish(true); });
            setTimeout(function () { finish(false, new Error('전송 시간이 초과되었습니다.')); }, 12000);
            f.submit();
        });
    }

    function submitJson(d) {
        if (!FORM_ENDPOINT) return Promise.reject(new Error('수신 주소가 설정되지 않았습니다.'));
        return fetch(FORM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(d)
        }).then(function (res) {
            if (!res.ok) throw new Error('서버가 ' + res.status + ' 응답을 보냈습니다.');
        });
    }

    function showDone(d) {
        if (summaryEl) summaryEl.textContent = buildBody(d);
        if (form) form.hidden = true;
        if (done) {
            done.hidden = false;
            done.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        }
    }

    if (form) {
        // 첫 입력 시점을 한 번만 기록 (폼 시작 → 제출 이탈률 측정용)
        form.addEventListener('input', function () {
            if (applyStarted) return;
            applyStarted = true;
            track('apply_start', {});
        }, { once: false });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            clearError();

            // 봇 트랩에 값이 차 있으면 조용히 중단한다
            var hp = form.elements['website'];
            if (hp && hp.value) return;

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

            track('apply_submit', { tier: data.tier, referred: data.referrer !== '(없음)' });

            if (FORM_PROVIDER === 'mailto' || !FORM_ENDPOINT) {
                openMailto(data);
                showDone(data);
                track('apply_success', { provider: 'mailto' });
                return;
            }

            setBusy(true);
            var sending = FORM_PROVIDER === 'googleForm' ? submitGoogleForm(data) : submitJson(data);

            sending.then(function () {
                setBusy(false);
                showDone(data);
                track('apply_success', { provider: FORM_PROVIDER });
            }).catch(function (err) {
                setBusy(false);
                track('apply_error', { provider: FORM_PROVIDER, message: String(err && err.message) });
                showError('전송에 실패했습니다 (' + (err && err.message ? err.message : '알 수 없는 오류') +
                    '). 잠시 후 다시 시도하시거나, 아래 버튼으로 메일로 보내주세요.');
                var retry = document.createElement('button');
                retry.type = 'button';
                retry.className = 'btn btn-ghost btn-sm form-mail-fallback';
                retry.textContent = '메일로 보내기';
                retry.addEventListener('click', function () {
                    openMailto(data);
                    showDone(data);
                });
                if (errorEl && !errorEl.querySelector('.form-mail-fallback')) errorEl.appendChild(retry);
            });
        });
    }

    if (againBtn) {
        againBtn.addEventListener('click', function () {
            if (done) done.hidden = true;
            if (form) {
                form.hidden = false;
                form.reset();
                clearError();
                setBusy(false);
                form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
            }
        });
    }

    /* ========== 10. 설정값을 화면에 반영 (정원 / 멤버 사진 / 공개 아카이브) ========== */
    function renderSeats() {
        var s = C.seats;
        if (!s) return;
        function put(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
        if (s.core) put('seatCore', '정원 <strong>' + s.core.total + '</strong>명' +
            (s.core.remaining != null ? ' <span class="seat-rest">· 잔여 ' + s.core.remaining + '</span>' : ''));
        if (s.member) put('seatMember', '정원 <strong>' + s.member.total + '</strong>명' +
            (s.member.remaining != null ? ' <span class="seat-rest">· 잔여 ' + s.member.remaining + '</span>' : ''));
        if (s.guest) put('seatGuest', '회당 <strong>' + s.guest.perSession + '</strong>석');

        var left = document.getElementById('seatLeft');
        if (left && s.member && s.guest) {
            var n = s.member.remaining != null ? s.member.remaining : s.member.total;
            left.textContent = 'MEMBER ' + n + '석 / GUEST 회당 ' + s.guest.perSession + '석';
        }
    }

    function renderMemberPhotos() {
        (C.members || []).forEach(function (m) {
            if (!m || !m.photo) return;
            var card = document.querySelector('.member[data-member="' + m.name + '"]');
            if (!card || card.querySelector('.member-photo')) return;
            var img = document.createElement('img');
            img.className = 'member-photo';
            img.alt = m.name;
            img.width = 56; img.height = 56;
            // 사진이 없거나 깨지면 조용히 이니셜 표시로 되돌린다.
            // 리스너를 src 지정 전에 붙이고, lazy 로딩은 쓰지 않는다
            // (lazy 면 화면 밖에서는 로드를 시도하지 않아 빈 칸이 남는다)
            img.addEventListener('error', function () { img.remove(); });
            img.src = m.photo.indexOf('/') === 0 || /^https?:/.test(m.photo)
                ? m.photo : 'assets/members/' + m.photo;
            card.insertBefore(img, card.firstChild);
        });
    }

    function renderArchive() {
        var items = C.archive || [];
        var wrap = document.getElementById('pubArchive');
        var list = document.getElementById('pubArchiveList');
        if (!wrap || !list || !items.length) return;

        items.slice().sort(function (a, b) {
            return String(b.date || '').localeCompare(String(a.date || ''));
        }).forEach(function (it) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = it.url || '#';
            if (/^https?:/.test(it.url || '')) { a.target = '_blank'; a.rel = 'noopener'; }
            a.className = 'pub-archive-item';

            var type = document.createElement('span');
            type.className = 'pub-archive-type mono';
            type.textContent = it.type || 'ARCHIVE';

            var title = document.createElement('span');
            title.className = 'pub-archive-title';
            title.textContent = it.title || '(제목 없음)';

            var date = document.createElement('span');
            date.className = 'pub-archive-date mono';
            date.textContent = it.date || '';

            a.appendChild(type); a.appendChild(title); a.appendChild(date);
            a.addEventListener('click', function () {
                track('archive_open', { title: it.title, type: it.type });
            });
            li.appendChild(a);
            list.appendChild(li);
        });
        wrap.hidden = false;
    }

    /* ========== 10b. 주요 상호작용 측정 ========== */
    function wireTracking() {
        document.querySelectorAll('a[href="#apply"]').forEach(function (a) {
            a.addEventListener('click', function () {
                track('cta_click', { from: a.closest('section') ? a.closest('section').id : 'header' });
            });
        });
        document.querySelectorAll('.filter-chip').forEach(function (c) {
            c.addEventListener('click', function () { track('session_filter', { tag: c.dataset.filter }); });
        });
        document.querySelectorAll('.session-head').forEach(function (h) {
            h.addEventListener('click', function () {
                if (h.getAttribute('aria-expanded') === 'true') {
                    track('session_open', { session: h.querySelector('h3').textContent.trim() });
                }
            });
        });
    }

    /* ========== 11. 라이브 워크플로우 시뮬레이터 ==========
       모든 합계·절감률·연간 환산은 아래 데이터에서 런타임 계산한다.
       (수치를 하드코딩하지 않아 데이터와 표시가 어긋날 수 없다)          */
    var SIM_JOBS = {
        report: {
            freqLabel: '주 1회 기준', perYear: 52,
            sessions: [['사례 PT/시연', 'case'], ['프롬프트', 'workflow'], ['업무자동화', 'workflow']],
            before: [
                { label: '자료 수집', min: 40, note: '여러 시스템과 메일함을 오가며 원본을 찾는 데 시간이 가장 많이 듭니다.' },
                { label: '데이터 정리', min: 35, note: '형식이 제각각인 자료를 손으로 다시 표에 옮겨 담습니다.' },
                { label: '초안 작성', min: 60, note: '매달 같은 구조의 문서를 매번 백지에서 다시 씁니다.' },
                { label: '검토·수정', min: 25, note: '숫자와 문장을 눈으로 다시 대조합니다.' },
                { label: '취합·배포', min: 10, note: '수신자별로 파일을 바꿔 붙여 보냅니다.' }
            ],
            after: [
                { kind: 'human', label: '소스·목적 지정', min: 5, note: '사람이 하는 일은 여기부터입니다. 무엇을 위한 보고인지 정의합니다.' },
                { kind: 'ai', label: '자료 수집·요약', min: 3, note: '지정한 소스를 AI가 읽고 필요한 수치만 추려냅니다.' },
                { kind: 'ai', label: '초안 생성', min: 2, note: '지난달 보고서를 템플릿으로 학습시켜 같은 구조로 생성합니다.' },
                { kind: 'human', label: '검토·판단', min: 20, note: '줄어들지 않는 단계입니다. 해석과 책임은 사람의 몫입니다.' },
                { kind: 'agent', label: '포맷·배포 자동화', min: 1, note: '수신자별 포맷 변환과 발송을 에이전트가 처리합니다.' }
            ]
        },
        cs: {
            freqLabel: '주 5회 기준', perYear: 250,
            sessions: [['Agent 제작', 'agent'], ['업무자동화', 'workflow'], ['프롬프트', 'workflow']],
            before: [
                { label: '문의 분류', min: 15, note: '어떤 유형인지, 누가 맡을지 사람이 먼저 읽고 판단합니다.' },
                { label: '이력 조회', min: 20, note: '고객 이력을 여러 화면에서 찾아 맞춰 봅니다.' },
                { label: '답변 작성', min: 30, note: '비슷한 문의에도 매번 처음부터 씁니다.' },
                { label: '상급자 확인', min: 20, note: '검토 대기 시간이 실제 응답 지연의 대부분입니다.' },
                { label: '발송·기록', min: 5, note: '발송 후 별도 시스템에 다시 기록합니다.' }
            ],
            after: [
                { kind: 'agent', label: '자동 분류·라우팅', min: 1, note: '유형 분류와 담당자 배정을 에이전트가 즉시 처리합니다.' },
                { kind: 'agent', label: '이력 자동 첨부', min: 1, note: '관련 이력을 자동으로 끌어와 한 화면에 붙입니다.' },
                { kind: 'ai', label: '답변 초안 생성', min: 2, note: '승인된 답변 사례를 근거로 톤과 정책을 맞춰 생성합니다.' },
                { kind: 'human', label: '승인·톤 조정', min: 8, note: 'Human-in-the-Loop. 고객에게 나가는 문장은 반드시 사람이 확인합니다.' },
                { kind: 'agent', label: '자동 발송·기록', min: 1, note: '발송과 CRM 기록이 한 번에 끝납니다.' }
            ]
        },
        research: {
            freqLabel: '월 2회 기준', perYear: 24,
            sessions: [['뉴스·트렌드', 'discover'], ['책·논문·아티클', 'archive'], ['프롬프트', 'workflow']],
            before: [
                { label: '키워드·범위 설정', min: 30, note: '무엇을 찾을지부터 막막한 단계입니다.' },
                { label: '자료 탐색', min: 90, note: '검색과 스크랩을 반복하며 가장 긴 시간을 씁니다.' },
                { label: '요약 정리', min: 60, note: '읽은 것을 다시 사람이 요약해 옮깁니다.' },
                { label: '시사점 도출', min: 45, note: '정작 가장 중요한 이 단계에 남는 힘이 거의 없습니다.' },
                { label: '문서화', min: 30, note: '보고 형식에 맞춰 다시 편집합니다.' }
            ],
            after: [
                { kind: 'human', label: '리서치 질문 설계', min: 10, note: '좋은 답은 좋은 질문에서 나옵니다. 여기에 시간을 더 씁니다.' },
                { kind: 'ai', label: '병렬 탐색·수집', min: 5, note: '여러 갈래를 동시에 탐색해 원문 링크와 함께 모읍니다.' },
                { kind: 'ai', label: '자동 요약·구조화', min: 3, note: '수집한 자료를 비교 가능한 형태로 구조화합니다.' },
                { kind: 'human', label: '시사점 판단', min: 35, note: '절약한 시간을 여기에 재투자합니다. 리서치의 진짜 가치입니다.' },
                { kind: 'agent', label: '템플릿 문서화', min: 2, note: '사내 보고 양식으로 자동 변환합니다.' }
            ]
        },
        minutes: {
            freqLabel: '주 3회 기준', perYear: 156,
            sessions: [['Agent 제작', 'agent'], ['업무자동화', 'workflow'], ['Problem Solver', 'solving']],
            before: [
                { label: '녹취 재확인', min: 45, note: '회의를 사실상 두 번 듣습니다.' },
                { label: '요약 작성', min: 40, note: '발언을 정리해 문장으로 다시 씁니다.' },
                { label: '액션아이템 추출', min: 20, note: '놓친 항목이 생기고, 나중에 분쟁의 원인이 됩니다.' },
                { label: '담당자 배정·공유', min: 15, note: '메신저와 이슈 트래커에 따로 옮겨 적습니다.' }
            ],
            after: [
                { kind: 'ai', label: '자동 전사', min: 1, note: '회의가 끝나는 즉시 전문이 확보됩니다.' },
                { kind: 'ai', label: '요약 생성', min: 2, note: '결정 사항과 보류 사항을 나눠 정리합니다.' },
                { kind: 'agent', label: '액션 추출·티켓화', min: 1, note: '담당자와 기한이 붙은 티켓으로 바로 등록됩니다.' },
                { kind: 'human', label: '확인·배정', min: 10, note: '사람은 맞는지 보고 우선순위만 정합니다.' },
                { kind: 'agent', label: '자동 공유', min: 1, note: '참석자와 관련 채널에 자동 배포됩니다.' }
            ]
        }
    };

    var KIND_LABEL = { manual: '사람', human: '사람', ai: 'AI', agent: '에이전트' };

    var simTabs = Array.prototype.slice.call(document.querySelectorAll('.sim-tab'));
    var simBefore = document.getElementById('simBefore');
    var simAfter = document.getElementById('simAfter');
    var simDetail = document.getElementById('simDetail');
    var SIM_HINT = '각 단계에 마우스를 올리거나 키보드로 이동하면 설명이 표시됩니다.';

    function sumMin(steps) {
        return steps.reduce(function (t, s) { return t + s.min; }, 0);
    }

    function fmtDuration(min) {
        var h = Math.floor(min / 60), m = min % 60;
        if (h && m) return h + '시간 ' + m + '분';
        if (h) return h + '시간';
        return m + '분';
    }

    function buildNodes(listEl, steps, defaultKind) {
        listEl.textContent = '';
        steps.forEach(function (step, i) {
            var kind = step.kind || defaultKind;
            var li = document.createElement('li');
            li.className = 'sim-node';
            li.setAttribute('data-kind', kind);
            li.style.setProperty('--sd', (i * 80) + 'ms');
            li.tabIndex = 0;

            var badge = document.createElement('span');
            badge.className = 'sim-node-kind';
            badge.textContent = KIND_LABEL[kind];

            var label = document.createElement('span');
            label.className = 'sim-node-label';
            label.textContent = step.label;

            var min = document.createElement('span');
            min.className = 'sim-node-min';
            min.textContent = step.min + '분';

            li.appendChild(badge);
            li.appendChild(label);
            li.appendChild(min);

            function show() { simDetail.innerHTML = '<strong>' + step.label + '</strong> · ' + step.note; }
            function clear() { simDetail.textContent = SIM_HINT; }
            li.addEventListener('mouseenter', show);
            li.addEventListener('mouseleave', clear);
            li.addEventListener('focus', show);
            li.addEventListener('blur', clear);

            listEl.appendChild(li);
        });
    }

    function animateNum(el, to, dur) {
        if (reduceMotion) { el.textContent = String(to); return; }
        var from = parseFloat(el.textContent.replace(/[^\d.]/g, '')) || 0;
        var start = null;
        function step(ts) {
            if (start === null) start = ts;
            var p = Math.min((ts - start) / (dur || 700), 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.round(from + (to - from) * eased));
            if (p < 1) window.requestAnimationFrame(step);
        }
        window.requestAnimationFrame(step);
    }

    function renderJob(key) {
        var job = SIM_JOBS[key];
        if (!job) return;

        var beforeTotal = sumMin(job.before);
        var afterTotal = sumMin(job.after);
        var saved = beforeTotal - afterTotal;
        var pct = Math.round((saved / beforeTotal) * 100);
        var yearHours = Math.round((saved * job.perYear) / 60);

        buildNodes(simBefore, job.before, 'manual');
        buildNodes(simAfter, job.after, 'ai');
        simDetail.textContent = SIM_HINT;

        document.getElementById('simBeforeTotal').textContent = fmtDuration(beforeTotal);
        document.getElementById('simAfterTotal').textContent = fmtDuration(afterTotal);
        document.getElementById('simValBefore').textContent = beforeTotal + '분';
        document.getElementById('simValAfter').textContent = afterTotal + '분';

        // meter is scaled to the longer of the two, so the bars are comparable
        document.getElementById('simBarBefore').style.width = '100%';
        document.getElementById('simBarAfter').style.width = ((afterTotal / beforeTotal) * 100) + '%';

        animateNum(document.getElementById('simSaveMin'), saved);
        animateNum(document.getElementById('simSavePct'), pct);
        animateNum(document.getElementById('simSaveYear'), yearHours, 900);
        document.getElementById('simFreq').textContent = '(' + job.freqLabel + ')';

        var rel = document.getElementById('simSessions');
        rel.textContent = '';
        job.sessions.forEach(function (pair) {
            var a = document.createElement('a');
            a.href = '#sessions';
            a.textContent = pair[0];
            a.setAttribute('data-session-filter', pair[1]);
            rel.appendChild(a);
        });
    }

    function selectTab(tab) {
        simTabs.forEach(function (t) {
            var on = t === tab;
            t.classList.toggle('is-active', on);
            t.setAttribute('aria-selected', String(on));
            t.tabIndex = on ? 0 : -1;
        });
        document.getElementById('simpanel').setAttribute('aria-labelledby', tab.id);
        var job = tab.getAttribute('data-job');
        track('sim_tab', { job: job });
        renderJob(job);
    }

    if (simTabs.length && simBefore && simAfter) {
        simTabs.forEach(function (tab) {
            tab.addEventListener('click', function () { selectTab(tab); });
        });

        // 좌우 방향키로 탭 이동 (WAI-ARIA tabs 패턴)
        document.querySelector('.sim-tabs').addEventListener('keydown', function (e) {
            var i = simTabs.indexOf(document.activeElement);
            if (i === -1) return;
            var next = null;
            if (e.key === 'ArrowRight') next = simTabs[(i + 1) % simTabs.length];
            else if (e.key === 'ArrowLeft') next = simTabs[(i - 1 + simTabs.length) % simTabs.length];
            else if (e.key === 'Home') next = simTabs[0];
            else if (e.key === 'End') next = simTabs[simTabs.length - 1];
            if (!next) return;
            e.preventDefault();
            next.focus();
            selectTab(next);
        });

        // 관련 세션 칩 → 세션 섹션으로 이동하며 해당 태그 필터 적용
        document.getElementById('simSessions').addEventListener('click', function (e) {
            var a = e.target.closest('a[data-session-filter]');
            if (!a) return;
            var chip = document.querySelector('.filter-chip[data-filter="' + a.getAttribute('data-session-filter') + '"]');
            if (chip) chip.click();
        });

        renderJob('report');
    }

    /* ========== 12. 초기 실행 ========== */
    renderSessionDate();
    renderSeats();
    renderMemberPhotos();
    renderArchive();
    wireTracking();
    onScroll();
})();
