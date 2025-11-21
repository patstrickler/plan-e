# plan-e

A work planning tool that helps organize projects, milestones, and tasks.

## Features

- **Projects**: Create and manage multiple projects
- **Milestones**: Organize work into milestones within projects
- **Tasks**: Track individual tasks within milestones
- **Full CRUD**: Create, read, update, and delete projects, milestones, and tasks
- **Task Status Updates**: Change task status (Not Started, In Progress, Completed)
- **Task Editing**: Edit task details including title, description, priority, effort, and assigned resources
- **Modern UI**: Clean, responsive interface with dark mode support

## Getting Started

### Prerequisites

- Node.js 18+ and npm (optional - only needed for local development server)

### Installation

1. Install dependencies (optional):
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

Or simply open `index.html` directly in your browser - no build step required!

## Docker

### Prerequisites

- Docker and Docker Compose installed on your system

### Running with Docker

1. **Build and run with Docker Compose** (recommended):
```bash
docker-compose up -d
```

2. **Or build and run with Docker directly**:
```bash
docker build -t plan-e .
docker run -d -p 3000:80 --name plan-e plan-e
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Commands

- **Stop the container**: `docker-compose down` or `docker stop plan-e`
- **View logs**: `docker-compose logs -f` or `docker logs -f plan-e`
- **Rebuild after changes**: `docker-compose up -d --build`

## Deployment

### GitHub Pages

**Using GitHub Actions (Recommended)**

1. Push your code to GitHub
2. Go to your repository Settings > Pages
3. Set Source to "GitHub Actions"
4. The workflow (`.github/workflows/deploy-pages.yml`) will automatically deploy on every push to `main`

### Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your repository in Vercel
3. Vercel will automatically detect and deploy the static site

Or use the GitHub Actions workflow (requires Vercel tokens in GitHub secrets):
- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

## Project Structure

- `/index.html` - Main HTML file
- `/js/app.js` - Main application logic
- `/js/storage.js` - Data storage and CRUD operations
- `/styles.css` - Application styles

## Usage

1. **Create a Project**: Click "New Project" and enter a title and optional description
2. **Add Milestones**: Expand a project and click "Add Milestone"
3. **Add Tasks**: Expand a milestone and click "Add Task"
4. **Update Task Status**: Use the status dropdown on any task card to change its status
5. **Edit Tasks**: Click the "Edit" button on any task to modify its details
6. **Edit/Delete**: Use the Edit and Delete buttons to modify or remove projects, milestones, and tasks

## Tech Stack

- **Vanilla JavaScript** - No frameworks, pure JavaScript
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with dark mode support
- **localStorage** - Client-side data persistence (works offline!)

## Data Storage

All data is stored in your browser's localStorage. This means:
- ✅ Your data persists across browser sessions
- ✅ No backend/server required
- ✅ Works offline
- ✅ Privacy-focused (data stays in your browser)
- ⚠️ Data is stored per browser/device
