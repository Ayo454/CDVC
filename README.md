# Word of God Live Stream

This repository contains the public live page and dashboard for the Word of God Deliverance Vineyard Church live stream.

## Deploying to GitHub

1. Create a repository on GitHub.
2. In this folder, run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

3. Enable GitHub Pages in repository settings:
   - Source: `main` branch
   - Folder: `/ (root)`

4. Open the published URL:
   - `https://<your-username>.github.io/<your-repo>/live.html`

## Important note

This project currently uses a backend server for live streaming and Socket.io.

- GitHub Pages can host the static public page only.
- The live stream will work on phone only if the backend server is also deployed to a public URL.

If you want, I can help you update the pages so they connect to a real deployed backend address instead of `localhost`.