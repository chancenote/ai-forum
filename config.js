/* ============================================================
   Morning AI Forum — 운영 설정
   ------------------------------------------------------------
   사이트 운영 중 바뀌는 값은 전부 이 파일에만 있습니다.
   index.html / styles.css / script.js 는 건드릴 필요가 없습니다.
   수정 후 저장 → 커밋 → 배포하면 바로 반영됩니다.
   ============================================================ */

window.MAF_CONFIG = {

    /* ---------- 1. 연락처 ---------- */
    contactEmail: 'contact@nextcw.com',

    /* ---------- 2. 신청서 수신 방법 ----------
       provider 를 바꾸면 신청서가 가는 곳이 바뀝니다.

         'mailto'     기본값. 신청자의 메일 앱이 열립니다. (백엔드 불필요)
         'formspree'  Formspree 폼 주소를 endpoint 에 붙입니다.
         'googleForm' 구글폼으로 보냅니다. endpoint + googleFormFields 필요.
         'webhook'    JSON 을 받는 자체 엔드포인트(Make, n8n, Apps Script 등).

       설정 방법은 docs/FORM-SETUP.md 를 보세요.
    */
    form: {
        provider: 'mailto',
        endpoint: '',

        // provider: 'googleForm' 일 때만 사용합니다.
        // 구글폼 각 문항의 entry.xxxxx 값을 넣어주세요.
        googleFormFields: {
            name: '',
            org: '',
            email: '',
            tier: '',
            interest: '',
            topic: '',
            referrer: ''
        }
    },

    /* ---------- 3. 정원 현황 ----------
       모집 상황에 맞춰 remaining 만 줄여가면 사이트에 자동 반영됩니다. */
    seats: {
        core: { total: 6, remaining: 6 },
        member: { total: 14, remaining: 14 },
        guest: { perSession: 2 }
    },

    /* ---------- 4. 다음 세션 날짜 ----------
       비워두면 '매월 둘째 주 금요일 07:00' 을 자동 계산합니다.
       공휴일 등으로 날짜를 옮길 때만 'YYYY-MM-DD' 형식으로 지정하세요.
       예: nextSessionOverride: '2026-10-16'                          */
    nextSessionOverride: null,

    /* ---------- 5. 코어 멤버 사진 ----------
       assets/members/ 폴더에 사진을 넣고 파일명을 적으면 표시됩니다.
       비워두면 이름 이니셜이 대신 표시됩니다. (정사각형 이미지 권장)    */
    members: [
        { name: '이지훈', photo: '' },
        { name: '황원택', photo: '' },
        { name: '고경환', photo: '' },
        { name: '이종찬', photo: '' }
    ],

    /* ---------- 6. 공개 아카이브 ----------
       세션 결과물을 공개할 때마다 아래에 한 줄씩 추가하세요.
       비어 있으면 사이트에서 해당 영역이 아예 보이지 않습니다.
       type: 'PROMPT' | 'AGENT' | 'WORKFLOW' | 'BRIEFING' | 'CASE'

       예:
         { date: '2026-10-09', type: 'PROMPT',
           title: '보고서 초안 생성 프롬프트 카드',
           url: 'https://www.notion.so/...' }
    */
    archive: [],

    /* ---------- 7. 이벤트 측정 ----------
       Google Analytics / Vercel Analytics / Plausible 중
       사이트에 설치된 것을 자동으로 감지해 이벤트를 보냅니다.
       설치된 도구가 없으면 아무 일도 하지 않습니다.                  */
    analytics: { enabled: true }
};
