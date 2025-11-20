'use client';

import { useState, useEffect } from 'react';
import { Milestone } from '@/types';
import TaskCard from './TaskCard';
import { createTask, updateMilestone, deleteMilestone, getProject } from '@/lib/storage-client';

interface MilestoneCardProps {
  projectId: string;
  milestone: Milestone;
  onUpdate: () => void;
}

export default function MilestoneCard({ projectId, milestone, onUpdate }: MilestoneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(milestone.title);
  const [editDescription, setEditDescription] = useState(milestone.description || '');
  const [currentMilestone, setCurrentMilestone] = useState(milestone);

  // Refresh milestone data
  const refreshMilestone = () => {
    const project = getProject(projectId);
    if (project) {
      const updated = project.milestones.find(m => m.id === milestone.id);
      if (updated) {
        setCurrentMilestone(updated);
      }
    }
    onUpdate();
  };

  // Sync milestone prop changes
  useEffect(() => {
    setCurrentMilestone(milestone);
  }, [milestone]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      createTask(projectId, milestone.id, {
        title: taskTitle,
        description: taskDescription || undefined,
      });
      setTaskTitle('');
      setTaskDescription('');
      setShowAddTask(false);
      refreshMilestone();
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleUpdateMilestone = () => {
    try {
      updateMilestone(projectId, milestone.id, {
        title: editTitle,
        description: editDescription || undefined,
      });
      setIsEditing(false);
      refreshMilestone();
    } catch (error) {
      console.error('Failed to update milestone:', error);
    }
  };

  const handleDeleteMilestone = () => {
    if (!confirm(`Are you sure you want to delete "${displayMilestone.title}"?`)) return;

    try {
      deleteMilestone(projectId, milestone.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete milestone:', error);
    }
  };

  const displayMilestone = currentMilestone || milestone;

  const completedTasks = displayMilestone.tasks.filter((t) => t.completed).length;
  const totalTasks = displayMilestone.tasks.length;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Milestone title"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Description (optional)"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateMilestone}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(displayMilestone.title);
                    setEditDescription(displayMilestone.description || '');
                  }}
                  className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {displayMilestone.title}
              </h3>
              {displayMilestone.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                  {displayMilestone.description}
                </p>
              )}
              {displayMilestone.dueDate && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                  Due: {new Date(displayMilestone.dueDate).toLocaleDateString()}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {completedTasks}/{totalTasks} tasks completed
              </p>
            </>
          )}
        </div>
        {!isEditing && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800"
            >
              Edit
            </button>
            <button
              onClick={handleDeleteMilestone}
              className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isExpanded && !isEditing && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-4">
            {!showAddTask ? (
              <button
                onClick={() => setShowAddTask(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                + Add Task
              </button>
            ) : (
              <form onSubmit={handleAddTask} className="space-y-2">
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Task title"
                  autoFocus
                />
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Description (optional)"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    Add Task
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTask(false);
                      setTaskTitle('');
                      setTaskDescription('');
                    }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="space-y-2">
            {displayMilestone.tasks.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                No tasks yet. Add one above!
              </p>
            ) : (
              displayMilestone.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  projectId={projectId}
                  milestoneId={displayMilestone.id}
                  task={task}
                  onUpdate={refreshMilestone}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

