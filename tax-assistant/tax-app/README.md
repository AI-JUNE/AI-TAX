# 세무 어시스턴트 AI

AI 기반 세무 실무 어시스턴트 (지출분석 · 세무조정 · 세금계산 · 신고일정 · 판례검색)

---

## 배포 방법 (GitHub + Vercel, 10분)

### 1단계: Anthropic API 키 발급
1. https://console.anthropic.com 접속
2. 로그인 → API Keys → Create Key
3. 키 복사해서 보관 (sk-ant-... 형태)

### 2단계: GitHub에 올리기
1. https://github.com 에서 New repository 클릭
2. 레포 이름 입력 (예: tax-assistant) → Create repository
3. 아래 명령어 실행:

```bash
cd tax-assistant
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/본인계정/tax-assistant.git
git push -u origin main
```

### 3단계: Vercel 배포
1. https://vercel.com 접속 → GitHub로 로그인
2. "Add New Project" → 방금 만든 레포 선택
3. **Environment Variables** 섹션에서:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...` (복사한 API 키)
4. Deploy 클릭

### 4단계: 완료
- 배포 완료 후 `https://tax-assistant-xxx.vercel.app` 주소로 접속
- 이후 코드 수정 → git push 하면 자동 재배포

---

## 로컬 개발 실행

```bash
npm install

# .env.local 파일 만들고 API 키 입력
echo "ANTHROPIC_API_KEY=sk-ant-여기에키입력" > .env.local

npm run dev
# http://localhost:5173 접속
```

---

## 파일 구조

```
tax-assistant/
├── api/
│   └── chat.js        ← Vercel 서버 함수 (API 키 보관)
├── src/
│   ├── App.jsx        ← 메인 UI
│   └── main.jsx       ← React 진입점
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── .gitignore
```
