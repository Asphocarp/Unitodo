import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { parseTodoMarkdown } from '@/app/utils';

export async function GET() {
  try {
    // Read the markdown file
    const filePath = path.join(process.cwd(), 'public', 'unitodo.sync.md');
    const data = await fs.readFile(filePath, 'utf-8');
    
    // Parse the markdown to get the categories
    const categories = parseTodoMarkdown(data);
    
    // Return the parsed data
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error reading todo data:', error);
    return NextResponse.json(
      { error: 'Failed to load todo data' },
      { status: 500 }
    );
  }
} 