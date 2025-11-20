import { NextRequest, NextResponse } from 'next/server';
import { createTask } from '@/lib/storage';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; milestoneId: string } }
) {
  try {
    const body = await request.json();
    const { title, description } = body;
    
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    const task = createTask(params.id, params.milestoneId, { title, description });
    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Project not found' || error.message === 'Milestone not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

