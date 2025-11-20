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

### Build for Production

```bash
npm run build
npm start
```

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
- **JSON File Storage** - Simple file-based data persistence
