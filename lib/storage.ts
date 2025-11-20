import fs from 'fs';
import path from 'path';
import { DataStore, Project, Milestone, Task } from '@/types';

const DATA_FILE = path.join(process.cwd(), 'data.json');

function readData(): DataStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading data:', error);
  }
  return { projects: [] };
}

function writeData(data: DataStore): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing data:', error);
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

export function createTask(projectId: string, milestoneId: string, task: Omit<Task, 'id' | 'milestoneId' | 'createdAt' | 'updatedAt' | 'completed'>): Task {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) throw new Error('Project not found');
  
  const milestone = project.milestones.find(m => m.id === milestoneId);
  if (!milestone) throw new Error('Milestone not found');
  
  const newTask: Task = {
    ...task,
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    milestoneId,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  milestone.tasks.push(newTask);
  milestone.updatedAt = new Date().toISOString();
  project.updatedAt = new Date().toISOString();
  writeData(data);
  return newTask;
}

export function updateTask(projectId: string, milestoneId: string, taskId: string, updates: Partial<Omit<Task, 'id' | 'milestoneId' | 'createdAt'>>): Task | null {
  const data = readData();
  const project = data.projects.find(p => p.id === projectId);
  if (!project) return null;
  
  const milestone = project.milestones.find(m => m.id === milestoneId);
  if (!milestone) return null;
  
  const taskIndex = milestone.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return null;
  
  milestone.tasks[taskIndex] = {
    ...milestone.tasks[taskIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  milestone.updatedAt = new Date().toISOString();
  project.updatedAt = new Date().toISOString();
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

