'use client';

import { useState } from 'react';
import { Task, TaskStatus, Priority, EffortLevel } from '@/types';
import { updateTask, deleteTask } from '@/lib/storage-client';

interface TaskCardProps {
  projectId: string;
  milestoneId: string;
  task: Task;
  onUpdate: () => void;
}

export default function TaskCard({ projectId, milestoneId, task, onUpdate }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editStatus, setEditStatus] = useState<TaskStatus>(task.status);
  const [editPriority, setEditPriority] = useState<Priority | ''>(task.priority || '');
  const [editEffort, setEditEffort] = useState<EffortLevel | ''>(task.effortLevel || '');
  const [editResource, setEditResource] = useState(task.assignedResource || '');

  const handleStatusChange = (newStatus: TaskStatus) => {
    try {
      updateTask(projectId, milestoneId, task.id, {
        status: newStatus,
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleUpdateTask = () => {
    try {
      updateTask(projectId, milestoneId, task.id, {
        title: editTitle,
        description: editDescription || undefined,
        status: editStatus,
        priority: editPriority || undefined,
        effortLevel: editEffort || undefined,
        assignedResource: editResource || undefined,
      });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = () => {
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;

    try {
      deleteTask(projectId, milestoneId, task.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const getPriorityColor = (priority?: Priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300';
      case 'high': return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300';
      case 'low': return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
      case 'in-progress': return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
      case 'not-started': return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const isCompleted = task.status === 'completed';

  return (
    <div
      className={`bg-white dark:bg-gray-700 rounded-md p-3 border border-gray-200 dark:border-gray-600 ${
        isCompleted ? 'opacity-75' : ''
      }`}
    >
      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            placeholder="Task title"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            placeholder="Description (optional)"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Priority</label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as Priority | '')}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Effort</label>
              <select
                value={editEffort}
                onChange={(e) => setEditEffort(e.target.value as EffortLevel | '')}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">None</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="x-large">X-Large</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Resource</label>
              <input
                type="text"
                value={editResource}
                onChange={(e) => setEditResource(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Assigned to"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpdateTask}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditTitle(task.title);
                setEditDescription(task.description || '');
                setEditStatus(task.status);
                setEditPriority(task.priority || '');
                setEditEffort(task.effortLevel || '');
                setEditResource(task.assignedResource || '');
              }}
              className="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              className={`px-2 py-1 text-xs rounded-md border-0 ${getStatusColor(task.status)} font-medium cursor-pointer`}
            >
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            {task.priority && (
              <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <h4
                className={`text-sm font-medium ${
                  isCompleted
                    ? 'line-through text-gray-500 dark:text-gray-400'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {task.title}
              </h4>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteTask}
                className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800"
              >
                Delete
              </button>
            </div>
          </div>
          {task.description && (
            <p
              className={`text-xs ${
                isCompleted
                  ? 'line-through text-gray-400 dark:text-gray-500'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {task.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            {task.effortLevel && (
              <span>Effort: {task.effortLevel}</span>
            )}
            {task.assignedResource && (
              <span>Assigned to: {task.assignedResource}</span>
            )}
            {task.startDate && (
              <span>Started: {new Date(task.startDate).toLocaleDateString()}</span>
            )}
            {task.completedDate && (
              <span>Completed: {new Date(task.completedDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
