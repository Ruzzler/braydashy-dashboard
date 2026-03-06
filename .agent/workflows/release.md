---
description: How to release a new version of BrayDashy Dashboard
---

# Release Workflow

This project follows an industry-standard branching strategy:
- **`main`**: Stable, production-ready code. Only contains merged, tested features.
- **`dev`**: Active development branch. All new features and WIP code live here.

## Steps to Release

1. **Complete Work on `dev`**:
   - Ensure all features are implemented and tested.
   - Run `npm run build` in `/frontend` to verify the build passes.

2. **Finalize Version & Changelog**:
   - Update `package.json` and `frontend/package.json` with the new version number (e.g., `0.9.0`).
   - Finalize the `## [Unreleased]` or current draft section in `CHANGELOG.md`.

3. **Merge to `main`**:
   - Switch to `main`: `git checkout main`
   - Merge `dev`: `git merge dev`
   - Push to GitHub: `git push origin main`

4. **Verification**:
   - Wait for GitHub Actions to complete (Deploy Demo & Build Docker).
   - Check the live demo at https://ruzzler.github.io/braydashy-dashboard/ to verify the version number and features.

5. **Continue Development**:
   - Switch back to `dev` for the next cycle: `git checkout dev`
