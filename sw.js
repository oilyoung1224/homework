/* ══════════════════════════════════════════════════════════════════
   숙검완료 — 서비스워커

   역할은 딱 하나: "이 사이트를 앱으로 설치할 수 있다"는 조건을
   브라우저에게 만족시켜 주는 것입니다.

   크롬이 앱 설치(WebAPK)를 허용하는 3가지 조건
     ① HTTPS                → GitHub Pages 가 기본 제공
     ② manifest.json        → 같은 폴더에 있음
     ③ fetch 핸들러가 있는 서비스워커 → 이 파일

   숙제 데이터는 절대 캐시하지 않습니다. 캐시하면 채점 결과나 마감
   정보가 옛날 것으로 보일 수 있기 때문입니다. 앱 껍데기(아이콘,
   매니페스트, 래퍼 HTML)만 캐시합니다.
   ══════════════════════════════════════════════════════════════════ */

var CACHE = 'sgw-shell-v1';

// 앱 껍데기 파일만. Apps Script 주소는 절대 넣지 않습니다.
// (report는 별도 sw.js로 관할이 분리돼 있으므로 여기 넣지 않는다)
var SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      // 파일 하나가 없어도 설치가 통째로 실패하지 않도록 개별 처리
      .then(function (c) {
        return Promise.all(SHELL.map(function (u) {
          return c.add(u).catch(function () {});
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;

  // GET 이 아니거나 다른 도메인(= Apps Script 등)이면 손대지 않는다.
  // 여기서 가로채면 숙제 데이터가 옛날 것으로 굳을 수 있다.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // report/ 이하는 별도 앱(학습 리포트)의 영역이므로 절대 건드리지 않는다.
  // 경로상 학생용 scope(/homework/)가 /homework/report/ 를 포함하기 때문에,
  // 여기서 명시적으로 제외하지 않으면 두 앱의 캐시가 섞일 수 있다.
  if (new URL(req.url).pathname.indexOf('/report/') !== -1) return;

  // 앱 껍데기: 네트워크 우선, 실패하면 캐시 (오프라인에서도 최소한 열림)
  e.respondWith(
    fetch(req)
      .then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy).catch(function () {}); });
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
  );
});
