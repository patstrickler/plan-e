# plan-e

A work planning tool that helps organize projects, milestones, and tasks.

## Features

- **Projects**: Create and manage multiple projects
- **Milestones**: Organize work into milestones within projects
- **Tasks**: Track individual tasks within milestones
- **Full CRUD**: Create, read, update, and delete projects, milestones, and tasks
- **Task Completion**: Mark tasks as complete/incomplete with checkboxes
- **Modern UI**: Clean, responsive interface with dark mode support

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production (Static Export)

```bash
npm run build
```

This creates a static export in the `out` directory that can be deployed to any static hosting service.

## Deployment

### GitHub Pages

1. Build the static export:
```bash
npm run build
```

2. The `out` directory contains the static site that can be deployed to GitHub Pages.

3. In your GitHub repository settings, enable GitHub Pages and point it to the `out` directory.

### Vercel (Recommended)

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your repository in Vercel
3. Vercel will automatically detect Next.js and deploy

Or use the GitHub Actions workflow (requires Vercel tokens in GitHub secrets):
- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

## Project Structure

- `/app` - Next.js app directory with pages and API routes
- `/components` - React components for UI elements
- `/lib` - Utility functions and data storage
- `/types` - TypeScript type definitions
- `/data.json` - Data storage (auto-generated, git-ignored)

## Usage

1. **Create a Project**: Click "New Project" and enter a title and optional description
2. **Add Milestones**: Expand a project and click "Add Milestone"
3. **Add Tasks**: Expand a milestone and click "Add Task"
4. **Complete Tasks**: Check the checkbox next to any task to mark it complete
5. **Edit/Delete**: Use the Edit and Delete buttons to modify or remove items

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **localStorage** - Client-side data persistence (works offline!)

## Data Storage

All data is stored in your browser's localStorage. This means:
- ✅ Your data persists across browser sessions
- ✅ No backend/server required
- ✅ Works offline
- ✅ Privacy-focused (data stays in your browser)
- ⚠️ Data is stored per browser/device
