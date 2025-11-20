'use client';

import { useState } from 'react';
import { Task } from '@/types';
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

  const handleToggleComplete = () => {
    try {
      updateTask(projectId, milestoneId, task.id, {
        completed: !task.completed,
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleUpdateTask = () => {
    try {
      updateTask(projectId, milestoneId, task.id, {
        title: editTitle,
        description: editDescription || undefined,
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

  return (
    <div
      className={`bg-white dark:bg-gray-700 rounded-md p-3 border border-gray-200 dark:border-gray-600 ${
        task.completed ? 'opacity-60' : ''
      }`}
    >
      {isEditing ? (
        <div className="space-y-2">
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
              }}
              className="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={handleToggleComplete}
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div className="flex-1 min-w-0">
            <h4
              className={`text-sm font-medium ${
                task.completed
                  ? 'line-through text-gray-500 dark:text-gray-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {task.title}
            </h4>
            {task.description && (
              <p
                className={`text-xs mt-1 ${
                  task.completed
                    ? 'line-through text-gray-400 dark:text-gray-500'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {task.description}
              </p>
            )}
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
      )}
    </div>
  );
}

