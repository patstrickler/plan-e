'use client';

import { useState, useEffect } from 'react';
import { Milestone, Project, MilestonePriority } from '@/types';
import { getAllMilestones, getAllProjects, createMilestone } from '@/lib/storage-client';

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Array<Milestone & { project: Project }>>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestonePriority, setMilestonePriority] = useState<MilestonePriority | ''>('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');
  const [milestoneStakeholders, setMilestoneStakeholders] = useState<string[]>([]);
  const [newStakeholder, setNewStakeholder] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const fetchData = () => {
    try {
      const allMilestones = getAllMilestones();
      const allProjects = getAllProjects();
      setMilestones(allMilestones);
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

  const handleAddStakeholder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStakeholder.trim() && !milestoneStakeholders.includes(newStakeholder.trim())) {
      setMilestoneStakeholders([...milestoneStakeholders, newStakeholder.trim()]);
      setNewStakeholder('');
    }
  };

  const handleRemoveStakeholder = (name: string) => {
    setMilestoneStakeholders(milestoneStakeholders.filter(s => s !== name));
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim() || !selectedProjectId) return;

    try {
      createMilestone(selectedProjectId, {
        title: milestoneTitle,
        description: milestoneDescription || undefined,
        priority: milestonePriority || undefined,
        dueDate: milestoneDueDate || undefined,
        stakeholders: milestoneStakeholders.length > 0 ? milestoneStakeholders : undefined,
      });
      setMilestoneTitle('');
      setMilestoneDescription('');
      setMilestonePriority('');
      setMilestoneDueDate('');
      setMilestoneStakeholders([]);
      setNewStakeholder('');
      setSelectedProjectId('');
      setShowAddMilestone(false);
      fetchData();
    } catch (error) {
      console.error('Failed to add milestone:', error);
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
            Milestones
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage all milestones across projects
          </p>
        </header>

        <div className="mb-6">
          {!showAddMilestone ? (
            <button
              onClick={() => setShowAddMilestone(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all"
            >
              + New Milestone
            </button>
          ) : (
            <form onSubmit={handleAddMilestone} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Create New Milestone
              </h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="milestone-project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project *
                  </label>
                  <select
                    id="milestone-project"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
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
                  <label htmlFor="milestone-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Milestone Title *
                  </label>
                  <input
                    id="milestone-title"
                    type="text"
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter milestone title"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label htmlFor="milestone-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    id="milestone-description"
                    value={milestoneDescription}
                    onChange={(e) => setMilestoneDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter milestone description"
                    rows={3}
                  />
                </div>
                <div>
                  <label htmlFor="milestone-priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority (optional)
                  </label>
                  <select
                    id="milestone-priority"
                    value={milestonePriority}
                    onChange={(e) => setMilestonePriority(e.target.value as MilestonePriority | '')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="milestone-due-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Due Date (optional)
                  </label>
                  <input
                    id="milestone-due-date"
                    type="date"
                    value={milestoneDueDate}
                    onChange={(e) => setMilestoneDueDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="milestone-stakeholders" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stakeholders (optional)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {milestoneStakeholders.map((stakeholder, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md text-sm"
                      >
                        {stakeholder}
                        <button
                          type="button"
                          onClick={() => handleRemoveStakeholder(stakeholder)}
                          className="ml-2 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      id="milestone-stakeholders"
                      type="text"
                      value={newStakeholder}
                      onChange={(e) => setNewStakeholder(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddStakeholder(e);
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter stakeholder name"
                    />
                    <button
                      type="button"
                      onClick={handleAddStakeholder}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  >
                    Create Milestone
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMilestone(false);
                      setMilestoneTitle('');
                      setMilestoneDescription('');
                      setMilestonePriority('');
                      setMilestoneDueDate('');
                      setMilestoneStakeholders([]);
                      setNewStakeholder('');
                      setSelectedProjectId('');
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
          {milestones.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                No milestones yet
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Create your first milestone to get started!
              </p>
            </div>
          ) : (
            milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {milestone.title}
                      </h3>
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                        {milestone.project.title}
                      </span>
                    </div>
                    {milestone.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        {milestone.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {milestone.priority && (
                        <span
                          className={`px-2 py-1 text-xs rounded font-medium ${
                            milestone.priority === 'high'
                              ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                              : milestone.priority === 'medium'
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                              : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          }`}
                        >
                          {milestone.priority.toUpperCase()}
                        </span>
                      )}
                      {milestone.dueDate && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Due: {new Date(milestone.dueDate).toLocaleDateString()}
                        </p>
                      )}
                      {milestone.stakeholders && milestone.stakeholders.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {milestone.stakeholders.map((stakeholder, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                            >
                              {stakeholder}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {milestone.tasks.filter(t => t.status === 'completed').length}/{milestone.tasks.length} tasks completed
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

