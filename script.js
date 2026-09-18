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
        renderJob(tab.getAttribute('data-job'));
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

    /* ========== 10. 초기 실행 ========== */
    renderSessionDate();
    onScroll();
})();
