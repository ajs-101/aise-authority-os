# AISE Authority OS

Four voice personalized LinkedIn content generators in one app, powered by Claude.
The API key stays hidden on Netlify Functions and never touches the browser.

- One login page, four accounts.
- Everyone has the same content tools.
- Only Ahmed (admin) sees the Settings page that controls the backend.

Accounts:
- Ahmed, username CAO, admin
- Aman, username COO
- Dacia, username CMO
- David, username CEO

(Passwords are set in netlify/functions/profiles.js.)

---

## Before you start
1. A Claude API key from console.anthropic.com
2. A free Netlify account
3. Node 18 or newer installed
4. Drop your logo file into the public folder named exactly `logo.png`
   (If there is no logo.png, the app shows a clean text logo instead. Nothing breaks.)

---

## Run these commands in order

### Step 1. Install the Netlify CLI (one time)
```
npm install -g netlify-cli
```

### Step 2. Go into the project folder
```
cd aise-authority-os
```

### Step 3. Add your Claude key for local testing
Create a file named `.env` in this folder with one line:
```
ANTHROPIC_API_KEY=sk-ant-your-real-key-here
```

### Step 4. Test it locally
```
netlify dev
```
Open the URL it prints (usually http://localhost:8888).
Log in as CAO / thisisthenewworld, go to Generate, and make a post.

### Step 5. Connect the site to Netlify (one time)
```
netlify init
```
Follow the prompts to create a new site.

### Step 6. Add the key to the live site
```
netlify env:set ANTHROPIC_API_KEY sk-ant-your-real-key-here
```
(You can also do this in the Netlify dashboard under Site settings, Environment variables.)

### Step 7. Deploy
```
netlify deploy --prod
```
That prints your live URL. Done.

---

## If you prefer the dashboard instead of the CLI
1. Zip the project folder.
2. Go to app.netlify.com, drag the folder in, or connect a Git repo.
3. Set the build publish directory to `public` and functions directory to `netlify/functions` (already in netlify.toml).
4. In Site settings, Environment variables, add ANTHROPIC_API_KEY.
5. Deploy.

---

## Editing the voices later
All four voice profiles, samples, passwords, and company knowledge live in:
```
netlify/functions/profiles.js
```
Edit it, then run `netlify deploy --prod` again.

## Notes
- Default model is Claude Sonnet 4.6. If you ever see a timeout, switch to Haiku in the Settings page.
- Saved drafts and the calendar are stored in each person's browser.
- David's bold style is kept, but guarantee language is reframed as engineered authority to stay compliant.
"# aise-authority-os" 
