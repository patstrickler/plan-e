import { NextRequest, NextResponse } from 'next/server';
import { createMilestone } from '@/lib/storage';

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json();
    const { title, description, dueDate } = body;
    
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    const milestone = createMilestone(params.projectId, { title, description, dueDate });
    return NextResponse.json(milestone, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Project not found') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 });
  }
}

