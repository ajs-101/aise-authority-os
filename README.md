# AISE Authority OS

Seven voice personalized LinkedIn content generators in one app, powered by Claude.
The API key stays hidden on Netlify Functions and never touches the browser.

- One login page, seven team accounts.
- AI Search Engineers (AISE) & Trustpoint Xposure (TPX) positioning.
- Post generator, weekly 7-day batch writer, compliance scanner, gap analyzer, and visual image prompt generator.
- Admins see the Settings panel to manage generation models and backend connections.

### Accounts:
- **Syed Muhammad Ahmed** (`ahmed` / `CAO`), Admin (AISE, Automation + AEO)
- **Abdul Rehman** (`abdul` / `Abdul Rehman`), Admin (AISE, MERN & AI Automation)
- **Aman Jamil** (`aman` / `COO`), Member (AISE, Calm Educational AEO)
- **Dacia Wilder** (`dacia` / `CMO`), Member (TPX, Executive Marketing)
- **David Wilder** (`david` / `CEO`), Member (TPX, Bold Authority)
- **Aasheen Khan** (`aasheen` / `Client Success Executive`), Member (AISE, Client Success)
- **Marium Khurram** (`marium` / `AnswerEngineOptimisationSpecialist`), Member (TPX, Writer & SEO)

*(Passwords and voice fingerprints are configured in `netlify/functions/profiles.js`.)*

---

## Codebase Architecture

```
aise-authority-os/
├── netlify/
│   └── functions/
│       ├── analyze.js      # Post & image analyzer handler
│       ├── generate.js     # Claude generation engine handler
│       ├── login.js        # Authentication & profile response handler
│       ├── profiles.js     # Voice profiles & company knowledge base
│       ├── status.js       # Admin backend status check handler
│       └── utils/
│           └── company.js  # Shared safe company lookup helper
└── public/
    ├── assets/             # Static graphics (logo.png)
    ├── css/
    │   └── styles.css      # Dark mode cinematic CSS styles
    ├── js/
    │   ├── data.js         # Display constants, funnels & pillars
    │   ├── utils.js        # DOM, local storage, escape & toast helpers
    │   ├── components.js   # Reusable UI component renderers
    │   ├── views.js        # Tab view render functions
    │   └── app.js          # Main application controller & router
    └── index.html          # Clean HTML shell
```

---

## Local Development & Deployment

### Step 1. Environment Setup
Create a `.env` file in the root folder:
```env
ANTHROPIC_API_KEY=sk-ant-your-real-key-here
```

### Step 2. Local Server
Run local dev server via Netlify CLI:
```bash
netlify dev
```
Open `http://localhost:8888`.

### Step 3. Production Deployment
Deploy directly via Netlify CLI:
```bash
netlify deploy --prod
```
