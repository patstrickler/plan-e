import { DataStore, Project, Milestone, Task } from '@/types';

const STORAGE_KEY = 'plan-e-data';

// Migrate old task format to new format
function migrateTask(task: any, projectId: string): Task {
  // If task already has new format, return as is
  if (task.status && task.projectId) {
    return task as Task;
  }
  
  // Migrate from old format
  const migrated: Task = {
    ...task,
    projectId: task.projectId || projectId,
    status: task.status || (task.completed ? 'completed' : 'not-started'),
    priority: task.priority || undefined,
    effortLevel: task.effortLevel || undefined,
    assignedResource: task.assignedResource || undefined,
    startDate: task.startDate || undefined,
    completedDate: task.completedDate || (task.completed ? task.updatedAt : undefined),
  };
  
  // Remove old completed field if it exists
  delete (migrated as any).completed;
  
  return migrated;
}

function migrateData(data: any): DataStore {
  if (!data || !data.projects) {
    return { projects: [] };
  }
  
  const migrated: DataStore = {
    projects: data.projects.map((project: any) => ({
      ...project,
      milestones: project.milestones?.map((milestone: any) => ({
        ...milestone,
        tasks: milestone.tasks?.map((task: any) => migrateTask(task, project.id)) || [],
      })) || [],
    })),
  };
  
  return migrated;
}

function readData(): DataStore {
  if (typeof window === 'undefined') {
    return { projects: [] };
  }
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      const migrated = migrateData(parsed);
      // Write back migrated data if migration occurred
      if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
        writeData(migrated);
      }
      return migrated;
    }
  } catch (error) {
    console.error('Error reading data from localStorage:', error);
  }
  return { projects: [] };
}

function writeData(data: DataStore): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing data to localStorage:', error);
    throw error;
  }
}

export function getAllProjects(): Project[] {
  const data = readData();
  return data.projects;
}

export function getProject(id: string): Project | undefined {
  const data = readData();
  return data.projects.find(p => p.id === id);
}

export function createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'milestones'>): Project {
  const data = readData();
  const newProject: Project = {
    ...project,
    id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    milestones: [],
  };
  data.projects.push(newProject);
  writeData(data);
  return newProject;
}

export function updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'milestones'>>): Project | null {
  const data = readData();
  const projectIndex = data.projects.findIndex(p => p.id === id);
  if (projectIndex === -1) return null;
  
  data.projects[projectIndex] = {
    ...data.projects[projectIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeData(data);
  return data.projects[projectIndex];
}

export function deleteProject(id: string): boolean {
  const data = readData();
  const initialLength = data.projects.length;
  data.projects = data.projects.filter(p => p.id !== id);
  writeData(data);
  return data.projects.length < initialLength;
}

export function createMilestone(projectId: string, milestone: Omit<Milestone, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'tasks'>): Milestone {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) throw new Error('Project not found');
  
  const newMilestone: Milestone = {
    ...milestone,
    id: `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tasks: [],
  };
  
  project.milestones.push(newMilestone);
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return newMilestone;
}

export function updateMilestone(projectId: string, milestoneId: string, updates: Partial<Omit<Milestone, 'id' | 'projectId' | 'createdAt' | 'tasks'>>): Milestone | null {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) return null;
  
  const milestoneIndex = project.milestones.findIndex(m => m.id === milestoneId);
  if (milestoneIndex === -1) return null;
  
  project.milestones[milestoneIndex] = {
    ...project.milestones[milestoneIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return project.milestones[milestoneIndex];
}

export function deleteMilestone(projectId: string, milestoneId: string): boolean {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) return false;
  
  const initialLength = project.milestones.length;
  project.milestones = project.milestones.filter(m => m.id !== milestoneId);
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return project.milestones.length < initialLength;
}

export function createTask(projectId: string, milestoneId: string, task: Omit<Task, 'id' | 'milestoneId' | 'projectId' | 'createdAt' | 'updatedAt' | 'status' | 'startDate' | 'completedDate'>): Task {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) throw new Error('Project not found');
  
  const milestone = project.milestones.find(m => m.id === milestoneId);
  if (!milestone) throw new Error('Milestone not found');
  
  const newTask: Task = {
    ...task,
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    milestoneId,
    projectId,
    status: 'not-started',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  milestone.tasks.push(newTask);
  milestone.updatedAt = new Date().toISOString();
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return newTask;
}

export function updateTask(projectId: string, milestoneId: string, taskId: string, updates: Partial<Omit<Task, 'id' | 'milestoneId' | 'projectId' | 'createdAt'>>): Task | null {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) return null;
  
  const milestone = project.milestones.find(m => m.id === milestoneId);
  if (!milestone) return null;
  
  const taskIndex = milestone.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return null;
  
  const currentTask = milestone.tasks[taskIndex];
  const now = new Date().toISOString();
  
  // Handle status transitions
  const statusUpdate: Partial<Task> = {};
  if (updates.status && updates.status !== currentTask.status) {
    if (updates.status === 'in-progress' && !currentTask.startDate) {
      statusUpdate.startDate = now;
    } else if (updates.status === 'completed' && !currentTask.completedDate) {
      statusUpdate.completedDate = now;
    } else if (updates.status === 'not-started') {
      // Reset dates if going back to not-started
      statusUpdate.startDate = undefined;
      statusUpdate.completedDate = undefined;
    } else if (updates.status === 'in-progress' && currentTask.status === 'completed') {
      // If going from completed back to in-progress, clear completed date
      statusUpdate.completedDate = undefined;
    }
  }
  
  milestone.tasks[taskIndex] = {
    ...currentTask,
    ...updates,
    ...statusUpdate,
    updatedAt: now,
  };
  milestone.updatedAt = now;
  project.updatedAt = now;
  writeData(data);
  return milestone.tasks[taskIndex];
}

export function deleteTask(projectId: string, milestoneId: string, taskId: string): boolean {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) return false;
  
  const milestone = project.milestones.find(m => m.id === milestoneId);
  if (!milestone) return false;
  
  const initialLength = milestone.tasks.length;
  milestone.tasks = milestone.tasks.filter(t => t.id !== taskId);
  milestone.updatedAt = new Date().toISOString();
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return milestone.tasks.length < initialLength;
}

// Helper functions for views
export function getAllMilestones(): Array<Milestone & { project: Project }> {
  const data = readData();
  const milestones: Array<Milestone & { project: Project }> = [];
  
  data.projects.forEach(project => {
    project.milestones.forEach(milestone => {
      milestones.push({ ...milestone, project });
    });
  });
  
  return milestones;
}

export function getAllTasks(): Array<Task & { milestone: Milestone; project: Project }> {
  const data = readData();
  const tasks: Array<Task & { milestone: Milestone; project: Project }> = [];
  
  data.projects.forEach(project => {
    project.milestones.forEach(milestone => {
      milestone.tasks.forEach(task => {
        tasks.push({ ...task, milestone, project });
      });
    });
  });
  
  return tasks;
}

