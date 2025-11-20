'use client';

import { useState, useEffect } from 'react';
import { Task, Milestone, Project, Priority, EffortLevel } from '@/types';
import { getAllTasks, getAllProjects, createTask } from '@/lib/storage-client';
import TaskCard from '@/components/TaskCard';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Array<Task & { milestone: Milestone; project: Project }>>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskEffort, setTaskEffort] = useState<EffortLevel>('medium');
  const [assignedResource, setAssignedResource] = useState('');

  const fetchData = () => {
    try {
      const allTasks = getAllTasks();
      const allProjects = getAllProjects();
      setTasks(allTasks);
      setProjects(allProjects);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get milestones for selected project
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const availableMilestones = selectedProject?.milestones || [];

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !selectedProjectId || !selectedMilestoneId) return;

    try {
      createTask(selectedProjectId, selectedMilestoneId, {
        title: taskTitle,
        description: taskDescription || undefined,
        priority: taskPriority,
        effortLevel: taskEffort,
        assignedResource: assignedResource || undefined,
      });
      setTaskTitle('');
      setTaskDescription('');
      setSelectedProjectId('');
      setSelectedMilestoneId('');
      setTaskPriority('medium');
      setTaskEffort('medium');
      setAssignedResource('');
      setShowAddTask(false);
      fetchData();
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Tasks
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage all tasks across projects and milestones
          </p>
        </header>

        <div className="mb-6">
          {!showAddTask ? (
            <button
              onClick={() => setShowAddTask(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all"
            >
              + New Task
            </button>
          ) : (
            <form onSubmit={handleAddTask} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Create New Task
              </h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="task-project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project *
                  </label>
                  <select
                    id="task-project"
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setSelectedMilestoneId(''); // Reset milestone when project changes
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="task-milestone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Milestone *
                  </label>
                  <select
                    id="task-milestone"
                    value={selectedMilestoneId}
                    onChange={(e) => setSelectedMilestoneId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={!selectedProjectId}
                  >
                    <option value="">Select a milestone</option>
                    {availableMilestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.title}
                      </option>
                    ))}
                  </select>
                  {!selectedProjectId && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Please select a project first
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Task Title *
                  </label>
                  <input
                    id="task-title"
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter task title"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    id="task-description"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <select
                      id="task-priority"
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as Priority)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="task-effort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Level of Effort
                    </label>
                    <select
                      id="task-effort"
                      value={taskEffort}
                      onChange={(e) => setTaskEffort(e.target.value as EffortLevel)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="x-large">X-Large</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="task-resource" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assigned Resource (optional)
                  </label>
                  <input
                    id="task-resource"
                    type="text"
                    value={assignedResource}
                    onChange={(e) => setAssignedResource(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter assigned resource name"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  >
                    Create Task
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTask(false);
                      setTaskTitle('');
                      setTaskDescription('');
                      setSelectedProjectId('');
                      setSelectedMilestoneId('');
                      setTaskPriority('medium');
                      setTaskEffort('medium');
                      setAssignedResource('');
                    }}
                    className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                No tasks yet
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Create your first task to get started!
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
                >
                  <div className="mb-3 flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                      {task.project.title}
                    </span>
                    <span className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded">
                      {task.milestone.title}
                    </span>
                  </div>
                  <TaskCard
                    projectId={task.projectId}
                    milestoneId={task.milestoneId}
                    task={task}
                    onUpdate={fetchData}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

